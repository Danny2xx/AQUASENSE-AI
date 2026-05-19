from __future__ import annotations
import math
import statistics
from typing import Any


BASE_SENSORS = [
    "flow_rate_lps", "temperature_c", "ph", "turbidity_ntu",
    "conductivity_us_cm", "dissolved_oxygen_mg_l", "orp_mv",
    "ammonia_mg_l", "uv254_abs", "tss_mg_l", "cod_mg_l", "bod_mg_l",
]

LAG_STEPS = {"5min": 1, "15min": 3, "30min": 6, "60min": 12, "120min": 24}

ROLLING_WINDOWS = {
    "15min": {"steps": 3, "stats": ["mean", "std", "min", "max", "median"]},
    "30min": {"steps": 6, "stats": ["mean", "std", "min", "max", "median", "range", "slope"]},
    "60min": {"steps": 12, "stats": ["mean", "std", "min", "max", "median", "range"]},
    "120min": {"steps": 24, "stats": ["mean", "std", "min", "max", "median", "range"]},
}


def _safe(val: Any) -> float | None:
    try:
        v = float(val)
        return None if math.isnan(v) or math.isinf(v) else v
    except (TypeError, ValueError):
        return None


def _rolling_stat(vals: list[float | None], stat: str) -> float | None:
    clean = [v for v in vals if v is not None]
    if not clean:
        return None
    if stat == "mean":
        return statistics.mean(clean)
    if stat == "std":
        return statistics.stdev(clean) if len(clean) >= 2 else 0.0
    if stat == "min":
        return min(clean)
    if stat == "max":
        return max(clean)
    if stat == "median":
        return statistics.median(clean)
    if stat == "range":
        return max(clean) - min(clean)
    if stat == "slope":
        if len(clean) < 2:
            return 0.0
        n = len(clean)
        x_mean = (n - 1) / 2.0
        num = sum((i - x_mean) * (v - statistics.mean(clean)) for i, v in enumerate(clean))
        den = sum((i - x_mean) ** 2 for i in range(n))
        return num / den if den > 0 else 0.0
    return None


def build_feature_row(
    buffer: list[dict[str, Any]],
    train_medians: dict[str, float],
    feature_columns: list[str],
    demo_limits: dict,
) -> list[float]:
    """
    Build one model-ready feature vector from a rolling buffer of raw sensor readings.
    Buffer should be sorted oldest-first. Returns a list of floats matching feature_columns order.
    """
    # Work on sensor values extracted from buffer (oldest first)
    sensor_series: dict[str, list[float | None]] = {s: [] for s in BASE_SENSORS}
    timestamps: list[str] = []

    for row in buffer:
        timestamps.append(row.get("timestamp", ""))
        for s in BASE_SENSORS:
            sensor_series[s].append(_safe(row.get(s)))

    n = len(buffer)
    current_idx = n - 1  # index of the most recent row

    # Map source_feature -> computed value
    features: dict[str, float | None] = {}

    for s in BASE_SENSORS:
        rt_key = f"{s}_rt"
        vals = sensor_series[s]
        current_val = vals[current_idx] if current_idx < len(vals) else None

        # Base (current) value
        features[rt_key] = current_val

        # Lag features
        for lag_name, lag_n in LAG_STEPS.items():
            lag_idx = current_idx - lag_n
            features[f"{rt_key}_lag_{lag_name}"] = vals[lag_idx] if lag_idx >= 0 else None

        # Rolling features
        for win_name, win_cfg in ROLLING_WINDOWS.items():
            steps = win_cfg["steps"]
            stats = win_cfg["stats"]
            start = max(0, current_idx - steps + 1)
            window_vals = vals[start: current_idx + 1]
            for stat in stats:
                features[f"{rt_key}_rolling_{win_name}_{stat}"] = _rolling_stat(window_vals, stat)

        # Delta features
        prev1 = vals[current_idx - 1] if current_idx >= 1 else None
        prev3 = vals[current_idx - 3] if current_idx >= 3 else None
        prev6 = vals[current_idx - 6] if current_idx >= 6 else None
        features[f"{rt_key}_delta_5min"] = (current_val - prev1) if (current_val is not None and prev1 is not None) else None
        features[f"{rt_key}_delta_15min"] = (current_val - prev3) if (current_val is not None and prev3 is not None) else None
        features[f"{rt_key}_delta_30min"] = (current_val - prev6) if (current_val is not None and prev6 is not None) else None

        # Pct change 30min
        if current_val is not None and prev6 is not None and prev6 != 0:
            features[f"{rt_key}_pct_change_30min"] = (current_val - prev6) / abs(prev6) * 100
        else:
            features[f"{rt_key}_pct_change_30min"] = None

    # Sensor jump flag
    any_jump = 0
    for s in BASE_SENSORS:
        vals = sensor_series[s]
        curr = vals[current_idx] if current_idx < len(vals) else None
        prev = vals[current_idx - 1] if current_idx >= 1 else None
        if curr is not None and prev is not None:
            delta = abs(curr - prev)
            history = [v for v in vals[max(0, current_idx - 12): current_idx] if v is not None]
            if len(history) >= 3:
                mean_v = statistics.mean(history)
                std_v = statistics.stdev(history) if len(history) >= 2 else 0
                if std_v > 0 and delta > 4 * std_v:
                    any_jump = 1
    features["any_sensor_jump_flag"] = float(any_jump)

    # Compliance margin features
    limits = demo_limits.get("limits", {})
    ph = features.get("ph_rt")
    cod = features.get("cod_mg_l_rt")
    bod = features.get("bod_mg_l_rt")
    tss = features.get("tss_mg_l_rt")
    ammonia = features.get("ammonia_mg_l_rt")
    temp = features.get("temperature_c_rt")
    flow = features.get("flow_rate_lps_rt")

    ph_min = limits.get("ph_min", 6.0)
    ph_max = limits.get("ph_max", 10.0)
    cod_max = limits.get("cod_max_mg_l", 1500)
    bod_max = limits.get("bod_max_mg_l", 900)
    tss_max = limits.get("tss_max_mg_l", 800)
    amm_max = limits.get("ammonia_max_mg_l", 180)
    temp_max = limits.get("temperature_max_c", 43)

    def _margin_pct(val, limit, lower=None):
        if val is None:
            return None
        if lower is not None:
            span = limit - lower
            return min((val - lower) / span * 100, (limit - val) / span * 100) if span > 0 else None
        return (limit - val) / limit * 100 if limit != 0 else None

    ph_margin_pct = _margin_pct(ph, ph_max, ph_min)
    cod_margin_pct = _margin_pct(cod, cod_max)
    bod_margin_pct = _margin_pct(bod, bod_max)
    tss_margin_pct = _margin_pct(tss, tss_max)
    amm_margin_pct = _margin_pct(ammonia, amm_max)
    temp_margin_pct = _margin_pct(temp, temp_max)

    all_margins = [m for m in [ph_margin_pct, cod_margin_pct, bod_margin_pct,
                                tss_margin_pct, amm_margin_pct, temp_margin_pct] if m is not None]
    features["min_margin_pct_rt"] = min(all_margins) if all_margins else None

    # Load features
    features["cod_load_rt"] = (cod * flow) if (cod is not None and flow is not None) else None
    features["bod_load_rt"] = (bod * flow) if (bod is not None and flow is not None) else None
    features["tss_load_rt"] = (tss * flow) if (tss is not None and flow is not None) else None
    features["ammonia_load_rt"] = (ammonia * flow) if (ammonia is not None and flow is not None) else None

    # Ratio features
    features["bod_cod_ratio_rt"] = (bod / (cod + 1e-6)) if (bod is not None and cod is not None) else None
    turbidity = features.get("turbidity_ntu_rt")
    features["tss_turbidity_ratio_rt"] = (tss / (turbidity + 1e-6)) if (tss is not None and turbidity is not None) else None
    uv254 = features.get("uv254_abs_rt")
    features["cod_uv254_ratio_rt"] = (cod / (uv254 + 1e-6)) if (cod is not None and uv254 is not None) else None
    do_val = features.get("dissolved_oxygen_mg_l_rt")
    features["do_cod_ratio_rt"] = (do_val / (cod + 1e-6)) if (do_val is not None and cod is not None) else None

    # Time features from most recent timestamp
    ts = buffer[-1].get("timestamp", "") if buffer else ""
    try:
        from datetime import datetime
        if "T" in ts:
            dt = datetime.fromisoformat(ts.replace("Z", ""))
        else:
            dt = datetime.fromisoformat(ts[:19])
        hour = dt.hour
        dow = dt.weekday()
        features["hour"] = float(hour)
        features["day_of_week"] = float(dow)
        features["is_weekend"] = 1.0 if dow >= 5 else 0.0
        features["is_working_hour"] = 1.0 if 8 <= hour <= 17 else 0.0
        features["sin_hour"] = math.sin(2 * math.pi * hour / 24)
        features["cos_hour"] = math.cos(2 * math.pi * hour / 24)
        features["sin_day_of_week"] = math.sin(2 * math.pi * dow / 7)
        features["cos_day_of_week"] = math.cos(2 * math.pi * dow / 7)
    except (ValueError, AttributeError):
        for k in ["hour", "day_of_week", "is_weekend", "is_working_hour",
                  "sin_hour", "cos_hour", "sin_day_of_week", "cos_day_of_week"]:
            features[k] = None

    # Build final vector: for each expected feature column, look up source_feature in features dict,
    # fall back to train median. Feature columns are "{source}__{imputed}" form.
    result = []
    for col in feature_columns:
        # col is like "flow_rate_lps_rt__imputed" -> source is "flow_rate_lps_rt"
        source = col.replace("__imputed", "")
        val = features.get(source)
        if val is None:
            val = train_medians.get(source, 0.0)
        result.append(float(val))

    return result


def check_sufficient_history(buffer: list[dict]) -> bool:
    """Returns True if buffer has enough rows for full 120-min lag features (25 rows minimum)."""
    return len(buffer) >= 25
