import sys
import json
import joblib
import pandas as pd
from pathlib import Path


def probability_to_risk_score(model, sample_df):
    probs = model.predict_proba(sample_df)[0]
    classes = model.classes_

    prob_map = {int(cls): float(prob) for cls, prob in zip(classes, probs)}

    p_low = prob_map.get(0, 0.0)
    p_moderate = prob_map.get(1, 0.0)
    p_high = prob_map.get(2, 0.0)

    # continuous base personalized risk score
    risk_score = (0.2 * p_low) + (0.6 * p_moderate) + (1.0 * p_high)

    return float(risk_score), prob_map


def label_from_prediction(predicted_label):
    if predicted_label == 0:
        return "Low"
    elif predicted_label == 1:
        return "Moderate"
    elif predicted_label == 2:
        return "High"
    return "Unknown"


def load_input(arg):
    possible_path = Path(arg)

    if possible_path.exists() and possible_path.is_file():
        with open(possible_path, "r", encoding="utf-8") as f:
            return json.load(f)

    return json.loads(arg)


def safe_float(value, default=0.0):
    try:
        if value is None or value == "":
            return default
        return float(value)
    except Exception:
        return default


def safe_trigger_list(x):
    if isinstance(x, list):
        return x
    if x is None:
        return []
    if isinstance(x, str):
        x = x.strip()
        if x == "":
            return []
        return [x]
    return []


def compute_bmi(weight_kg, height_cm):
    weight_kg = safe_float(weight_kg, 0.0)
    height_cm = safe_float(height_cm, 0.0)

    if height_cm <= 0:
        return 0.0

    return weight_kg / ((height_cm / 100.0) ** 2)


def encode_trigger_flags(trigger_list):
    trigger_list = [str(t).lower() for t in trigger_list]

    return {
        "trigger_dust": int(any("dust" in t for t in trigger_list)),
        "trigger_pollen": int(any(("pollen" in t) or ("seasonal" in t) for t in trigger_list)),
        "trigger_smoke": int(any("smoke" in t for t in trigger_list)),
        "trigger_humidity": int(any(("humidity" in t) or ("damp" in t) for t in trigger_list)),
        "trigger_cold_air": int(any("cold" in t for t in trigger_list)),
        "trigger_pollution": int(any(("pollution" in t) or ("traffic" in t) for t in trigger_list))
    }


def build_feature_row(input_data):
    severity_map = {
        "Intermittent": 0.20,
        "Mild Persistent": 0.40,
        "Moderate Persistent": 0.70,
        "Severe Persistent": 1.00
    }

    hospitalization_map = {
        "Never": 0.00,
        "More than 1 year ago": 0.30,
        "Within last year": 0.70,
        "Within last 3 months": 1.00
    }

    inhaler_map = {
        "Rarely": 0.20,
        "Sometimes": 0.50,
        "Often": 0.80,
        "Daily": 1.00
    }

    smoking_map = {
        "Non-smoker": 0.00,
        "Passive smoker": 0.40,
        "Former smoker": 0.30,
        "Current smoker": 1.00
    }

    triggers = safe_trigger_list(input_data.get("known_triggers", []))
    trigger_flags = encode_trigger_flags(triggers)

    row = {
        # sensor/global features
        "co_ppm": safe_float(input_data.get("co_ppm", 0)),
        "o3_ppb": safe_float(input_data.get("o3_ppb", 0)),
        "no2_ppb": safe_float(input_data.get("no2_ppb", 0)),
        "temperature": safe_float(input_data.get("temperature", 0)),
        "humidity": safe_float(input_data.get("humidity", 0)),
        "pm1": safe_float(input_data.get("pm1", 0)),
        "pm25": safe_float(input_data.get("pm25", 0)),
        "pm10": safe_float(input_data.get("pm10", 0)),

        # medical/profile features
        "age": safe_float(input_data.get("age", 0)),
        "bmi": compute_bmi(
            input_data.get("weight_kg", 0),
            input_data.get("height_cm", 0)
        ),
        "severity_score": severity_map.get(input_data.get("asthma_severity"), 0.0),
        "hospitalization_score": hospitalization_map.get(input_data.get("last_hospitalization"), 0.0),
        "inhaler_score": inhaler_map.get(input_data.get("rescue_inhaler_use"), 0.0),
        "smoking_score": smoking_map.get(input_data.get("smoking_status"), 0.0),

        # trigger flags
        "trigger_dust": trigger_flags["trigger_dust"],
        "trigger_pollen": trigger_flags["trigger_pollen"],
        "trigger_smoke": trigger_flags["trigger_smoke"],
        "trigger_humidity": trigger_flags["trigger_humidity"],
        "trigger_cold_air": trigger_flags["trigger_cold_air"],
        "trigger_pollution": trigger_flags["trigger_pollution"]
    }

    return row


def main():
    try:
        if len(sys.argv) < 2:
            raise ValueError("No input provided")

        input_data = load_input(sys.argv[1])

        model_path = Path(__file__).resolve().parent.parent / "models" / "personalized_risk_rf_bundle_v2.pkl"
        bundle = joblib.load(model_path)

        model = bundle["model"]
        features = bundle["features"]

        row = build_feature_row(input_data)

        input_df = pd.DataFrame([row])

        # ensure all expected feature columns exist
        for feature in features:
            if feature not in input_df.columns:
                input_df[feature] = 0

        input_df = input_df[features]

        predicted_label = int(model.predict(input_df)[0])
        risk_score, prob_map = probability_to_risk_score(model, input_df)

        output = {
            "success": True,
            "predicted_label": predicted_label,
            "predicted_label_name": label_from_prediction(predicted_label),
            "base_risk_score": risk_score,
            "probabilities": {
                "low": prob_map.get(0, 0.0),
                "moderate": prob_map.get(1, 0.0),
                "high": prob_map.get(2, 0.0)
            },
            "features_used": row
        }

        print(json.dumps(output))

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))


if __name__ == "__main__":
    main()