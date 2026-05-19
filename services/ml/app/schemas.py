from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional


class SensorReading(BaseModel):
    timestamp: str
    facility_id: str = "demo-food-processing-plant"
    flow_rate_lps: Optional[float] = None
    temperature_c: Optional[float] = None
    ph: Optional[float] = None
    turbidity_ntu: Optional[float] = None
    conductivity_us_cm: Optional[float] = None
    dissolved_oxygen_mg_l: Optional[float] = None
    orp_mv: Optional[float] = None
    ammonia_mg_l: Optional[float] = None
    uv254_abs: Optional[float] = None
    tss_mg_l: Optional[float] = None
    cod_mg_l: Optional[float] = None
    bod_mg_l: Optional[float] = None
    sensor_status: Optional[str] = "ok"
    event_type: Optional[str] = "normal"


class PredictRequest(BaseModel):
    readings: list[SensorReading] = Field(..., description="Rolling buffer of recent sensor readings, ordered oldest-first. Minimum 25 rows for full feature engineering.")


class ComplianceStatus(BaseModel):
    status: str                  # GREEN / AMBER / RED
    breached_parameters: list[str]
    warning_parameters: list[str]
    margins: dict[str, float]    # parameter -> % margin remaining


class ForecastValues(BaseModel):
    cod_mg_l: Optional[float] = None
    tss_mg_l: Optional[float] = None
    bod_mg_l: Optional[float] = None
    ammonia_mg_l: Optional[float] = None
    ph: Optional[float] = None


class PredictResponse(BaseModel):
    timestamp: str
    facility_id: str
    status: str                          # GREEN / WATCH / AMBER / RED
    compliance: ComplianceStatus
    breach_probability_30min: float
    breach_risk_label: str               # Low / Watch / High / Critical
    forecasts_30min: ForecastValues
    anomaly_flag: bool
    anomaly_reason: Optional[str] = None
    top_drivers: list[str]
    alert_reason: str
    recommended_action: str
    model_version: str
    sufficient_history: bool


class HealthResponse(BaseModel):
    status: str
    model_version: str
    feature_count: int
    classifier: str
    forecasters: list[str]
    anomaly_model: str
