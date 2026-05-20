import sys
import json
import joblib
import pandas as pd
from pathlib import Path


def probability_to_risk_score(model, sample_df):
    probs = model.predict_proba(sample_df)[0]
    classes = model.classes_

    prob_map = {int(cls): float(prob) for cls, prob in zip(classes, probs)}

    p_safe = prob_map.get(0, 0.0)
    p_moderate = prob_map.get(1, 0.0)
    p_high = prob_map.get(2, 0.0)

    risk_score = (0.0 * p_safe) + (0.5 * p_moderate) + (1.0 * p_high)

    return float(risk_score), prob_map


def label_from_prediction(predicted_label):
    if predicted_label == 0:
        return "Safe"
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


def main():
    try:
        if len(sys.argv) < 2:
            raise ValueError("No input provided")

        sensor_data = load_input(sys.argv[1])

        model_path = Path(__file__).resolve().parent.parent / \
            "models" / "environment_rf_bundle_v2.pkl"
        bundle = joblib.load(model_path)

        model = bundle["model"]
        features = bundle["features"]

        input_df = pd.DataFrame([sensor_data])
        input_df = input_df[features]

        predicted_label = int(model.predict(input_df)[0])
        risk_score, prob_map = probability_to_risk_score(model, input_df)

        output = {
            "success": True,
            "predicted_label": predicted_label,
            "predicted_label_name": label_from_prediction(predicted_label),
            "risk_score": risk_score,
            "probabilities": {
                "safe": prob_map.get(0, 0.0),
                "moderate": prob_map.get(1, 0.0),
                "high": prob_map.get(2, 0.0)
            }
        }

        print(json.dumps(output))

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))


if __name__ == "__main__":
    main()
