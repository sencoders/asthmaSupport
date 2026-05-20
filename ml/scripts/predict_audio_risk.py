import sys
import json
import math
from pathlib import Path

import numpy as np
import librosa
import torch

from wheeze_cnn_model import WheezeCNNFinal


BASE_DIR = Path(__file__).resolve().parents[1]
MODEL_PATH = BASE_DIR / "models" / "wheeze_cnn_final_fixed.pt"

SR = 22050
N_MELS = 128
HOP_LENGTH = 256
N_FFT = 2048
F_MIN = 50
F_MAX = 8000

WIN_S = 2
WIN_L = 4

FRAMES_S = int(math.ceil(SR * WIN_S / HOP_LENGTH)) + 1
FRAMES_L = int(math.ceil(SR * WIN_L / HOP_LENGTH)) + 1


def mel_from_chunk(chunk, target_frames):
    mx = np.abs(chunk).max()
    if mx > 0:
        chunk = chunk / mx

    mel = librosa.feature.melspectrogram(
        y=chunk,
        sr=SR,
        n_mels=N_MELS,
        hop_length=HOP_LENGTH,
        n_fft=N_FFT,
        fmin=F_MIN,
        fmax=F_MAX
    )

    mel_db = librosa.power_to_db(mel, ref=np.max)
    mel_db = (mel_db - mel_db.mean()) / (mel_db.std() + 1e-8)

    T = mel_db.shape[1]

    if T < target_frames:
        mel_db = np.pad(mel_db, ((0, 0), (0, target_frames - T)))
    else:
        mel_db = mel_db[:, :target_frames]

    return mel_db[np.newaxis].astype(np.float32)


def extract_segments_from_audio(wav_path):
    y, _ = librosa.load(str(wav_path), sr=SR, mono=True)

    y, _ = librosa.effects.trim(y, top_db=20)

    mx = np.abs(y).max()
    if mx > 0:
        y = y / mx

    long_samp = int(SR * WIN_L)
    short_samp = int(SR * WIN_S)
    hop_samp = int(SR * 2)

    segments = []

    if len(y) < long_samp:
        chunks = [np.pad(y, (0, long_samp - len(y)))]
    else:
        chunks = []
        pos = 0

        while pos + long_samp <= len(y):
            chunks.append(y[pos:pos + long_samp])
            pos += hop_samp

        tail = y[pos:]
        if len(tail) > int(SR * 1):
            chunks.append(np.pad(tail, (0, long_samp - len(tail))))

    for chunk_l in chunks:
        off = (long_samp - short_samp) // 2
        chunk_s = chunk_l[off:off + short_samp]

        mel_s = mel_from_chunk(chunk_s, FRAMES_S)
        mel_l = mel_from_chunk(chunk_l, FRAMES_L)

        segments.append({
            "short": mel_s,
            "long": mel_l
        })

    return segments


def load_model():
    ckpt = torch.load(MODEL_PATH, map_location="cpu")

    model = WheezeCNNFinal(
        dropout=ckpt["config"]["dropout"]
    )

    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()

    threshold = ckpt.get("threshold_f1", 0.639)

    return model, threshold


def predict_audio(wav_path):
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model not found: {MODEL_PATH}")

    segments = extract_segments_from_audio(wav_path)

    if len(segments) == 0:
        return {
            "success": False,
            "message": "No valid audio segments found"
        }

    model, threshold = load_model()

    probs = []

    with torch.no_grad():
        for seg in segments:
            short = torch.tensor(seg["short"][np.newaxis], dtype=torch.float32)
            long_ = torch.tensor(seg["long"][np.newaxis], dtype=torch.float32)

            prob = torch.sigmoid(model(short, long_)).item()
            probs.append(prob)

    probs = np.array(probs)

    conf = np.abs(probs - 0.5) * 2 + 0.1
    final_prob = float(np.average(probs, weights=conf))

    label = "Asthma-Wheeze" if final_prob >= threshold else "Normal"

    return {
        "success": True,
        "audioScore": round(final_prob, 3),
        "audioLabel": label,
        "threshold": round(float(threshold), 3),
        "segmentsUsed": len(segments)
    }


if __name__ == "__main__":
    try:
        wav_path = sys.argv[1]
        result = predict_audio(wav_path)
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({
            "success": False,
            "message": "Audio prediction failed",
            "error": str(e)
        }))







# import sys
# import json
# from pathlib import Path

# import numpy as np
# import librosa
# import joblib

# # Match v4 training config
# N_MFCC = 20
# N_MEL = 40
# N_BANDS = 8


# def extract_features_from_array(y, sr):
#     features = []

#     # MFCC + delta + delta2 (120 features)
#     mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=N_MFCC)
#     delta_mfcc = librosa.feature.delta(mfcc)
#     delta2_mfcc = librosa.feature.delta(mfcc, order=2)

#     for mat in [mfcc, delta_mfcc, delta2_mfcc]:
#         features.extend(mat.mean(axis=1))
#         features.extend(mat.std(axis=1))

#     # Mel spectrogram (80 features)
#     mel = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=N_MEL)
#     mel_db = librosa.power_to_db(mel, ref=np.max)
#     features.extend(mel_db.mean(axis=1))
#     features.extend(mel_db.std(axis=1))

#     # Spectral contrast (14 features)
#     contrast = librosa.feature.spectral_contrast(y=y, sr=sr, n_bands=6)
#     features.extend(contrast.mean(axis=1))
#     features.extend(contrast.std(axis=1))

#     # Chroma (24 features)
#     chroma = librosa.feature.chroma_stft(y=y, sr=sr)
#     features.extend(chroma.mean(axis=1))
#     features.extend(chroma.std(axis=1))

#     # Tonnetz (12 features)
#     try:
#         harmonic = librosa.effects.harmonic(y)
#         tonnetz = librosa.feature.tonnetz(y=harmonic, sr=sr)
#         features.extend(tonnetz.mean(axis=1))
#         features.extend(tonnetz.std(axis=1))
#     except Exception:
#         features.extend([0.0] * 12)

#     # Scalar spectral stats (10 features)
#     for feat in [
#         librosa.feature.zero_crossing_rate(y),
#         librosa.feature.spectral_centroid(y=y, sr=sr),
#         librosa.feature.spectral_bandwidth(y=y, sr=sr),
#         librosa.feature.spectral_rolloff(y=y, sr=sr),
#         librosa.feature.rms(y=y),
#     ]:
#         features.append(float(feat.mean()))
#         features.append(float(feat.std()))

#     # Per-band RMS + variance + ZCR + peak (32 features)
#     band_len = len(y) // N_BANDS
#     for b in range(N_BANDS):
#         band = y[b * band_len: (b + 1) * band_len]

#         if len(band) == 0:
#             features.extend([0.0, 0.0, 0.0, 0.0])
#             continue

#         rms_val = float(np.sqrt(np.mean(band ** 2)))
#         var_val = float(np.var(band))
#         zcr_val = float(np.mean(np.abs(np.diff(np.sign(band)))) / 2)
#         peak_val = float(np.max(np.abs(band)))

#         features.extend([rms_val, var_val, zcr_val, peak_val])

#     return np.array(features, dtype=np.float32)  # 292 features


# def extract_segments(file_path, sr=22050, window_sec=4, hop_sec=0.5):
#     y, sr = librosa.load(file_path, sr=sr, mono=True)
#     y, _ = librosa.effects.trim(y, top_db=20)

#     max_val = np.max(np.abs(y))
#     if max_val > 0:
#         y = y / max_val

#     window_len = int(sr * window_sec)
#     hop_len = int(sr * hop_sec)

#     segments = []
#     start = 0

#     while start + window_len <= len(y):
#         segment = y[start:start + window_len]
#         segments.append(extract_features_from_array(segment, sr))
#         start += hop_len

#     if not segments:
#         segments.append(extract_features_from_array(y, sr))

#     return segments


# def aggregate_segments(segments):
#     """
#     v4 aggregation:
#     mean + max + std
#     3 x 292 = 876 features
#     """
#     mat = np.vstack(segments)
#     mean = mat.mean(axis=0)
#     max_ = mat.max(axis=0)
#     std = mat.std(axis=0)
#     return np.concatenate([mean, max_, std]).astype(np.float32)


# def main():
#     if len(sys.argv) < 2:
#         print(json.dumps({"error": "Audio file path not provided"}))
#         sys.exit(1)

#     audio_path = sys.argv[1]
#     model_path = Path(__file__).resolve().parent.parent / "models" / "audio_rf_bundle_v4.pkl"

#     try:
#         bundle = joblib.load(model_path)
#         model = bundle["model"]
#         threshold = float(bundle.get("threshold", 0.5))

#         segments = extract_segments(audio_path)
#         feats = aggregate_segments(segments).reshape(1, -1)

#         expected_features = int(getattr(model, "n_features_in_", -1))
#         actual_features = int(feats.shape[1])

#         if expected_features != -1 and actual_features != expected_features:
#             print(json.dumps({
#                 "error": f"Feature mismatch: got {actual_features}, expected {expected_features}"
#             }))
#             sys.exit(1)

#         probs = model.predict_proba(feats)[0]

#         normal_prob = float(probs[0])
#         wheeze_prob = float(probs[1])
#         pred_label = "Asthma-Wheeze" if wheeze_prob >= threshold else "Normal"

#         result = {
#             "audio_score": round(wheeze_prob, 3),
#             "audio_label": pred_label,
#             "threshold": round(threshold, 3),
#             "probabilities": {
#                 "Normal": round(normal_prob, 3),
#                 "Asthma-Wheeze": round(wheeze_prob, 3)
#             }
#         }

#         print(json.dumps(result))

#     except Exception as e:
#         print(json.dumps({"error": str(e)}))
#         sys.exit(1)


# if __name__ == "__main__":
#     main()




