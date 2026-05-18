from __future__ import annotations
import json
from pathlib import Path
from typing import Any

_LIMITS_PATH = Path(__file__).parent.parent.parent.parent / "packages/shared/config/demo_limits.json"


def load_limits() -> dict:
    with open(_LIMITS_PATH) as f:
        return json.load(f)


LIMITS_CONFIG = load_limits()
LIMITS = LIMITS_CONFIG["limits"]
AMBER_MARGIN_PCT = LIMITS_CONFIG.get("amber_margin_pct", 15) / 100.0


def check_compliance(reading: dict[str, Any]) -> dict:
    """Apply deterministic compliance rules against the configured facility limits."""
    breached = []
    warning = []
    margins = {}

    def _check_upper(name: str, value: float | None, limit: float) -> None:
        if value is None:
            return
        margin_pct = (limit - value) / limit * 100
        margins[name] = round(margin_pct, 1)
        if value > limit:
            breached.append(name)
        elif margin_pct <= AMBER_MARGIN_PCT * 100:
            warning.append(name)

    def _check_range(name: str, value: float | None, lo: float, hi: float) -> None:
        if value is None:
            return
        span = hi - lo
        margin_lo = (value - lo) / span * 100
        margin_hi = (hi - value) / span * 100
        margin_pct = min(margin_lo, margin_hi)
        margins[name] = round(margin_pct, 1)
        if value < lo or value > hi:
            breached.append(name)
        elif margin_pct <= AMBER_MARGIN_PCT * 100:
            warning.append(name)

    _check_range("pH", reading.get("ph"), LIMITS["ph_min"], LIMITS["ph_max"])
    _check_upper("temperature_c", reading.get("temperature_c"), LIMITS["temperature_max_c"])
    _check_upper("COD", reading.get("cod_mg_l"), LIMITS["cod_max_mg_l"])
    _check_upper("BOD", reading.get("bod_mg_l"), LIMITS["bod_max_mg_l"])
    _check_upper("TSS", reading.get("tss_mg_l"), LIMITS["tss_max_mg_l"])
    _check_upper("ammonia", reading.get("ammonia_mg_l"), LIMITS["ammonia_max_mg_l"])

    if breached:
        status = "RED"
    elif warning:
        status = "AMBER"
    else:
        status = "GREEN"

    return {
        "status": status,
        "breached_parameters": breached,
        "warning_parameters": warning,
        "margins": margins,
    }


def rule_sensor_quality(buffer: list[dict[str, Any]]) -> tuple[bool, str | None]:
    """Rule-based sensor quality / anomaly detection."""
    if len(buffer) < 6:
        return False, None

    sensors = ["ph", "cod_mg_l", "tss_mg_l", "bod_mg_l", "ammonia_mg_l",
               "turbidity_ntu", "temperature_c", "dissolved_oxygen_mg_l"]

    current = buffer[-1]
    recent_six = buffer[-6:]

    issues = []

    for s in sensors:
        vals = [r.get(s) for r in recent_six if r.get(s) is not None]
        if len(vals) < 2:
            continue

        # Flatline: std == 0 over last 6 readings (30 min)
        vals_range = max(vals) - min(vals)
        if vals_range == 0 and len(vals) >= 6:
            issues.append(f"{s} flatline detected (no change in 30 min)")
            continue

        # Physical range check on current value
        val = current.get(s)
        if val is None:
            continue
        if s == "ph" and (val < 0 or val > 14):
            issues.append(f"pH physically impossible: {val:.2f}")
        elif s in ("cod_mg_l", "bod_mg_l", "tss_mg_l", "ammonia_mg_l") and val < 0:
            issues.append(f"{s} negative value: {val:.2f}")
        elif s == "temperature_c" and (val < 0 or val > 80):
            issues.append(f"temperature out of physical range: {val:.2f}")
        elif s == "dissolved_oxygen_mg_l" and (val < 0 or val > 20):
            issues.append(f"DO out of physical range: {val:.2f}")

        # Spike: current value > mean + 4 * std of recent history
        if len(vals) >= 4:
            import statistics
            mean_v = statistics.mean(vals[:-1])
            if len(vals) >= 3:
                std_v = statistics.stdev(vals[:-1])
                if std_v > 0 and abs(val - mean_v) > 4 * std_v:
                    issues.append(f"{s} spike detected (|delta| > 4σ)")

    if issues:
        return True, "; ".join(issues[:3])
    return False, None


RECOMMENDED_ACTIONS = {
    "COD": "Inspect organic-load process stream; consider diverting to holding tank if COD continues rising.",
    "BOD": "Inspect biodegradable organic discharge stream; increase aeration or biological treatment.",
    "TSS": "Inspect filtration/settling process; reduce solids discharge rate.",
    "ammonia": "Inspect nitrogen-rich waste stream; trigger confirmatory lab sample.",
    "pH": "Check acid/alkali dosing and chemical handling; neutralise before discharge.",
    "temperature_c": "Check cooling process; pause or reduce thermal discharge.",
    "anomaly": "Inspect sensor readings and recent process changes; verify calibration status.",
}


def get_recommended_action(breached: list[str], warning: list[str], anomaly: bool) -> str:
    if anomaly:
        return RECOMMENDED_ACTIONS["anomaly"]
    params = breached or warning
    if params:
        param = params[0]
        return RECOMMENDED_ACTIONS.get(param, f"Inspect {param} levels and discharge process.")
    return "All parameters within consent limits. Continue normal monitoring."


def get_limits_config() -> dict:
    return LIMITS_CONFIG
