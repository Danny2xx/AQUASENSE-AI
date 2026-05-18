from __future__ import annotations
import json
import joblib
import pandas as pd
from pathlib import Path
from typing import Any

from .feature_pipeline import build_feature_row, check_sufficient_history
from .rules import check_compliance, rule_sensor_quality, get_recommended_action

_MODEL_PATH = Path(__file__).parent.parent / "models/aquasense_best_models.joblib"
_MEDIANS_PATH = Path(__file__).parent.parent.parent.parent / "data/processed/preprocessing_train_medians.csv"
_SELECTION_PATH = Path(__file__).parent.parent.parent.parent / "data/processed/model_selection_summary.json"
_LIMITS_PATH = Path(__file__).parent.parent.parent.parent / "packages/shared/config/demo_limits.json"

_bundle = None
_train_medians: dict[str, float] = {}
_demo_limits: dict = {}
_selection_summary: dict = {}


def load_artifacts():
    global _bundle, _train_medians, _demo_limits, _selection_summary

    print("Loading model bundle...")
    _bundle = joblib.load(_MODEL_PATH)
    print(f"  classifier: {_bundle['metadata']['best_classifier_name']}")
    print(f"  feature_columns: {len(_bundle['metadata']['feature_columns'])}")

    medians_df = pd.read_csv(_MEDIANS_PATH)
    _train_medians = dict(zip(medians_df["feature"], medians_df["train_median"]))

    with open(_LIMITS_PATH) as f:
        _demo_limits = json.load(f)

    with open(_SELECTION_PATH) as f:
        _selection_summary = json.load(f)

    print("Artifacts loaded successfully.")


def get_bundle():
    return _bundle


def get_train_medians():
    return _train_medians


def get_demo_limits():
    return _demo_limits


def _breach_risk_label(prob: float, threshold: float) -> str:
    if prob >= 0.70:
        return "Critical"
    if prob >= threshold:
        return "High"
    if prob >= threshold * 0.5:
        return "Watch"
    return "Low"


def _top_drivers(bundle: dict, feature_row: list[float], n: int = 4) -> list[str]:
    feature_importance = bundle.get("feature_importance")
    if feature_importance is None:
        return []
    feature_columns = bundle["metadata"]["feature_columns"]

    if isinstance(feature_importance, pd.DataFrame):
        fi = feature_importance
    else:
        return []

    if "feature" not in fi.columns or "importance" not in fi.columns:
        return []

    # Filter to features with high current absolute values & high importance
    top = fi[fi["feature"].isin(feature_columns)].nlargest(20, "importance")
    drivers = []
    for _, row_fi in top.iterrows():
        fname = row_fi["feature"]
        if fname in feature_columns:
            idx = feature_columns.index(fname)
            val = feature_row[idx] if idx < len(feature_row) else None
            if val is not None:
                # Human-readable label
                label = fname.replace("__imputed", "").replace("_rt_", " ").replace("_rt", "").replace("_", " ")
                drivers.append(f"{label.strip()}: {val:.2f}")
        if len(drivers) >= n:
            break
    return drivers


def run_prediction(readings: list[dict[str, Any]]) -> dict:
    bundle = _bundle
    feature_columns = bundle["metadata"]["feature_columns"]
    threshold = bundle["metadata"]["best_classifier_threshold"]
    classifier = bundle["breach_classifier"]
    forecast_models = bundle["forecast_models"]

    current = readings[-1]
    sufficient = check_sufficient_history(readings)

    # 1. Compliance rules
    compliance = check_compliance(current)

    # 2. Anomaly detection
    anomaly_flag, anomaly_reason = rule_sensor_quality(readings)

    # 3. Feature engineering
    feature_row = build_feature_row(readings, _train_medians, feature_columns, _demo_limits)

    X = pd.DataFrame([feature_row], columns=feature_columns)

    # 4. Breach classifier
    try:
        proba = classifier.predict_proba(X)[0]
        # binary classifier: class 1 is breach
        classes = list(classifier.classes_)
        breach_prob = float(proba[classes.index(1)]) if 1 in classes else float(proba[-1])
    except Exception:
        breach_prob = 0.0

    # 5. Forecasters
    forecasts: dict[str, float | None] = {}
    forecast_key_map = {
        "target_cod_mg_l_plus_30min": "cod_mg_l",
        "target_tss_mg_l_plus_30min": "tss_mg_l",
        "target_bod_mg_l_plus_30min": "bod_mg_l",
        "target_ammonia_mg_l_plus_30min": "ammonia_mg_l",
        "target_ph_plus_30min": "ph",
    }
    for target_key, out_key in forecast_key_map.items():
        model = forecast_models.get(target_key)
        if model is not None:
            try:
                forecasts[out_key] = float(model.predict(X)[0])
            except Exception:
                forecasts[out_key] = None
        else:
            forecasts[out_key] = None

    # 6. Risk fusion
    current_status = compliance["status"]
    breach_label = _breach_risk_label(breach_prob, threshold)

    if current_status == "RED":
        final_status = "RED"
    elif breach_prob >= threshold or _forecast_will_breach(forecasts, _demo_limits):
        final_status = "AMBER" if current_status == "GREEN" else current_status
        if breach_prob >= 0.70:
            final_status = "RED"
    elif anomaly_flag:
        final_status = "WATCH" if current_status == "GREEN" else current_status
    else:
        final_status = current_status

    # 7. Top drivers
    drivers = _top_drivers(bundle, feature_row)

    # 8. Alert reason
    alert_reason = _build_alert_reason(compliance, breach_prob, threshold, anomaly_flag, anomaly_reason, forecasts, _demo_limits)

    recommended = get_recommended_action(compliance["breached_parameters"], compliance["warning_parameters"], anomaly_flag)

    return {
        "timestamp": current.get("timestamp", ""),
        "facility_id": current.get("facility_id", "demo-food-processing-plant"),
        "status": final_status,
        "compliance": compliance,
        "breach_probability_30min": round(breach_prob, 4),
        "breach_risk_label": breach_label,
        "forecasts_30min": forecasts,
        "anomaly_flag": anomaly_flag,
        "anomaly_reason": anomaly_reason,
        "top_drivers": drivers,
        "alert_reason": alert_reason,
        "recommended_action": recommended,
        "model_version": "aquasense_best_models.joblib",
        "sufficient_history": sufficient,
    }


def _forecast_will_breach(forecasts: dict, demo_limits: dict) -> bool:
    limits = demo_limits.get("limits", {})
    checks = [
        (forecasts.get("cod_mg_l"), limits.get("cod_max_mg_l")),
        (forecasts.get("bod_mg_l"), limits.get("bod_max_mg_l")),
        (forecasts.get("tss_mg_l"), limits.get("tss_max_mg_l")),
        (forecasts.get("ammonia_mg_l"), limits.get("ammonia_max_mg_l")),
    ]
    for val, limit in checks:
        if val is not None and limit is not None and val > limit:
            return True
    ph = forecasts.get("ph")
    if ph is not None:
        if ph < limits.get("ph_min", 6.0) or ph > limits.get("ph_max", 10.0):
            return True
    return False


def _build_alert_reason(compliance, breach_prob, threshold, anomaly_flag, anomaly_reason, forecasts, demo_limits) -> str:
    parts = []
    if compliance["breached_parameters"]:
        params = ", ".join(compliance["breached_parameters"])
        parts.append(f"Current breach: {params} exceeds configured limit.")
    if breach_prob >= threshold:
        parts.append(f"Model predicts {breach_prob*100:.0f}% breach probability in next 30 minutes.")
    if _forecast_will_breach(forecasts, demo_limits):
        parts.append("30-minute pollutant forecast shows limit crossing.")
    if anomaly_flag and anomaly_reason:
        parts.append(f"Sensor anomaly: {anomaly_reason}.")
    if not parts:
        parts.append("All parameters within consent limits.")
    return " ".join(parts)
