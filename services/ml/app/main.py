from __future__ import annotations
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schemas import PredictRequest, PredictResponse, HealthResponse, ComplianceStatus, ForecastValues
from .predict import load_artifacts, run_prediction, get_bundle
from .rules import get_limits_config


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_artifacts()
    yield


app = FastAPI(
    title="AquaSense AI – ML Service",
    description="Breach prediction, pollutant forecasting, and anomaly detection for wastewater compliance.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health():
    bundle = get_bundle()
    if bundle is None:
        raise HTTPException(503, "Model not loaded")
    meta = bundle["metadata"]
    return HealthResponse(
        status="ok",
        model_version="aquasense_best_models.joblib",
        feature_count=len(meta["feature_columns"]),
        classifier=meta["best_classifier_name"],
        forecasters=list(bundle["forecast_models"].keys()),
        anomaly_model=meta["best_anomaly_name"],
    )


@app.get("/model/metadata")
def model_metadata():
    bundle = get_bundle()
    if bundle is None:
        raise HTTPException(503, "Model not loaded")
    meta = bundle["metadata"]
    return {
        "classifier": meta["best_classifier_name"],
        "threshold": meta["best_classifier_threshold"],
        "forecasters": meta["best_forecaster_names"],
        "anomaly_model": meta["best_anomaly_name"],
        "feature_count": len(meta["feature_columns"]),
    }


@app.get("/model/feature-importance")
def feature_importance():
    bundle = get_bundle()
    if bundle is None:
        raise HTTPException(503, "Model not loaded")
    fi = bundle.get("feature_importance")
    if fi is None:
        return {"features": []}
    try:
        top = fi.nlargest(20, "importance")[["feature", "importance"]].to_dict(orient="records")
        return {"features": top}
    except Exception:
        return {"features": []}


@app.get("/limits")
def limits():
    return get_limits_config()


@app.post("/predict/full")
def predict_full(req: PredictRequest):
    if not req.readings:
        raise HTTPException(422, "readings list is empty")

    readings = [r.model_dump() for r in req.readings]
    result = run_prediction(readings)

    return {
        "timestamp": result["timestamp"],
        "facility_id": result["facility_id"],
        "status": result["status"],
        "compliance": result["compliance"],
        "breach_probability_30min": result["breach_probability_30min"],
        "breach_risk_label": result["breach_risk_label"],
        "forecasts_30min": result["forecasts_30min"],
        "anomaly_flag": result["anomaly_flag"],
        "anomaly_reason": result["anomaly_reason"],
        "top_drivers": result["top_drivers"],
        "alert_reason": result["alert_reason"],
        "recommended_action": result["recommended_action"],
        "model_version": result["model_version"],
        "sufficient_history": result["sufficient_history"],
    }


@app.post("/predict/compliance")
def predict_compliance(req: PredictRequest):
    if not req.readings:
        raise HTTPException(422, "readings list is empty")
    from .rules import check_compliance
    current = req.readings[-1].model_dump()
    return check_compliance(current)
