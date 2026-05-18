# AquaSense AI Model Artifacts and Dashboard Handoff

## Executive Position

AquaSense AI is now a multi-layer wastewater compliance prototype, not a single-model experiment. The current system combines deterministic compliance logic, leakage-safe time-series features, direct breach prediction, 30-minute pollutant forecasting, anomaly detection, model evaluation, explainability artifacts, and saved deployable model bundles.

This is strong enough for a trusted hackathon/demo prototype and a serious conversation with a real company. It should not be described as production-certified yet, because the current data is simulated/prototype data and the final test period contains no positive breach windows for the breach target. The correct production claim is:

> AquaSense AI provides a production-minded architecture that can be retrained and calibrated on real facility data, real consent limits, lab results, sensor maintenance logs, and confirmed incident records.

## What We Built

The project now has four core notebook stages:

1. `notebooks/data_acquisition.ipynb`
   - Builds the prototype wastewater telemetry and supporting lab/soft-sensor data.
   - Creates operational compliance data for pH, COD, BOD, TSS, ammonia, temperature, flow, turbidity, conductivity, DO, ORP, and related fields.

2. `notebooks/02_time_series_eda.ipynb`
   - Explores the time series behavior, pollutant distributions, compliance patterns, seasonality, spikes, and relationships between variables.
   - Helps justify which signals are realistic for alerting and model training.

3. `notebooks/03_preprocessing.ipynb`
   - Builds a leakage-safe supervised model matrix.
   - Uses temporal splits, causal lags, rolling features, train-only imputation, feature filtering, and explicit target creation.
   - Adds audit-only fields such as `breach_episode_id`, `incident_group_id`, and `minutes_to_next_breach`, while keeping them out of the feature list.

4. `notebooks/04_model_training_evaluation.ipynb`
   - Trains and compares breach classifiers, pollutant forecasters, and anomaly detectors.
   - Adds walk-forward validation, incident holdout evaluation, lead-time evaluation, calibration checks, feature importance, model selection, model-card output, and deployable artifacts.
   - Saves the best model bundle as `.joblib` and `.h5`.

ONNX export is intentionally skipped for now. The current deployable object is a multi-model Python bundle with scikit-learn/tree models, rules, thresholds, metadata, and feature lists. `joblib` is the correct primary deployment format for this architecture. The `.h5` file is useful as an HDF5-packaged artifact for demo/project requirements, but backend teams should prefer `.joblib` for actual Python inference.

## Saved Artifacts

The latest run produced the expected artifacts:

| Artifact | Path | Purpose |
|---|---|---|
| Classification results | `data/processed/model_classification_results.csv` | Direct breach-prediction comparison |
| Forecast results | `data/processed/model_forecast_results.csv` | 30-minute pollutant forecasting comparison |
| Anomaly results | `data/processed/model_anomaly_results.csv` | Sensor/process anomaly detector comparison |
| Feature importance | `data/processed/model_feature_importance.csv` | Explainability for model drivers |
| Calibration results | `data/processed/model_calibration_results.csv` | Probability reliability checks |
| Lead-time results | `data/processed/model_lead_time_results.csv` | Whether alerts arrive before breaches |
| Incident holdout results | `data/processed/model_incident_holdout_results.csv` | Harder event-level generalization test |
| Walk-forward results | `data/processed/model_walk_forward_results.csv` | Production-style temporal validation |
| Model selection summary | `data/processed/model_selection_summary.json` | Selected models, thresholds, and output map |
| Model card | `data/processed/model_card_summary.json` | Intended use, caveats, and governance summary |
| Primary model bundle | `services/ml/models/aquasense_best_models.joblib` | Recommended backend inference artifact |
| HDF5 model bundle | `services/ml/models/aquasense_best_models.h5` | HDF5-packaged bundle for demo/project requirement |

## Why The Rigorous Questions Mattered

The early breach-classification results looked almost perfect on the final test split, but that was misleading because the test period had zero positive breach windows. A model can score 100% accuracy there by predicting no breaches at all. That is not a useful production signal.

We corrected the interpretation by asking the right forensic questions:

- Is the split temporal, not random?
- Are future values leaking into features?
- Are audit columns excluded from training features?
- Does the test period contain positives?
- Are we measuring false alarms per day, not only accuracy?
- Can the model catch held-out incidents?
- Does the model provide useful lead time?
- Is direct breach prediction enough, or should we also forecast pollutant values?
- Is anomaly detection actually reliable, or just noisy?

Those questions improved the project from a fragile single-score demo into a layered and auditable architecture.

## Layer 1: Current Compliance Rules

Current compliance should be handled by deterministic rules, not machine learning.

For the dashboard:

- Show current status as `COMPLIANT`, `WARNING`, or `BREACH`.
- Compare live sensor/lab/soft-sensor values against configurable site-specific limits.
- Do not hard-code universal legal thresholds. Real facilities have consent/environmental permit limits that vary by site.
- Use the rules engine as the authoritative source for current breach status.

Recommended display:

- Current pH, COD, BOD, TSS, ammonia, temperature, and key process indicators.
- Limit, current value, margin to limit, and status color.
- Timestamp and data quality status.

## Layer 2: Direct Breach Prediction

Selected model in the current artifact:

- `hist_gradient_boosting`
- Target: `target_breach_next_30min`
- Threshold: about `0.00562`

Validation performance for the selected classifier:

- Precision: `0.917`
- Recall: `0.917`
- F1: `0.917`
- PR-AUC: `0.914`
- False alarms/day: `0.223`
- Lead time: caught the validation breach episode about `25 minutes` before breach

Critical caveat:

- The final test split has `0.0%` positives for the 30-minute breach target, so test recall, ROC-AUC, and PR-AUC are not meaningful for breach detection.
- Use test results there mainly to understand false alarm behavior.

Additional robustness checks:

- Walk-forward validation showed `lightgbm` had the strongest mean PR-AUC (`0.885`) with low false alarms/day (`0.210`).
- Incident holdout showed `extra_trees` had the best event-level F1 (`0.536`) and strongest recall/precision balance, but with more false alarms/day (`5.324`).

Recommendation:

- Use `hist_gradient_boosting` as the default demo classifier because it is already selected in the artifact and has a good validation balance.
- Keep `lightgbm` and `extra_trees` as comparison candidates in the model report.
- In the dashboard, show direct breach prediction as a risk score, not as an unquestionable truth.

Recommended dashboard language:

- `30-min breach risk: Low / Watch / High`
- `Predicted breach probability`
- `Alert threshold`
- `Estimated lead time`
- `Top contributing signals`

## Layer 3: Pollutant Forecasting

The forecasting layer is currently the strongest AI story for AquaSense. Instead of only asking whether a rare breach label will occur, it predicts where pollutant values are likely to be in 30 minutes.

Best validation forecasters:

| Target | Selected model | Validation MAE | Validation RMSE | Validation R2 | Interpretation |
|---|---:|---:|---:|---:|---|
| COD +30min | `random_forest` | `74.97 mg/L` | `96.33` | `0.606` | Moderate-good, useful with uncertainty |
| TSS +30min | `xgboost` | `37.60 mg/L` | `48.79` | `0.699` | Good forecasting layer |
| BOD +30min | `random_forest` | `46.82 mg/L` | `59.19` | `0.514` | Weakest but still informative |
| Ammonia +30min | `extra_trees` | `2.31 mg/L` | `3.01` | `0.717` | Good operational warning signal |
| pH +30min | `extra_trees` | `0.064 pH` | `0.082` | `0.820` | Excellent for demo and alerts |

Recommendation:

- Use forecasting as the main proactive compliance layer.
- Compare each forecasted value against the same configurable site limits used by the rules engine.
- Display predicted future limit margin, not just raw model score.

Recommended dashboard behavior:

- Show current value and +30 minute forecast on the same chart.
- Draw consent/permit limit lines.
- Highlight pollutants forecasted to cross limits.
- Show `time-to-risk` when forecast crosses a threshold.
- Use uncertainty wording such as `forecasted risk`, not absolute certainty.

## Layer 4: Anomaly Detection

The anomaly layer should be framed as sensor/process abnormality detection, not as the main breach predictor.

Best current anomaly detector:

- `rule_sensor_quality`

Validation performance:

- True positives: `7`
- False negatives: `0`
- False positives: `5`
- Recall: `1.000`
- Precision: `0.583`
- F1: `0.737`
- False alarms/day: about `1.116`

Comparison:

- `one_class_svm` caught validation positives but was less precise.
- `isolation_forest` was too noisy.
- `local_outlier_factor` was far too noisy for alerting.

Recommendation:

- Use `rule_sensor_quality` as the primary anomaly detector.
- Use unsupervised anomaly models only as secondary context, such as `unusual operating regime`.
- Do not let LOF or Isolation Forest directly trigger operator alerts in the demo unless retuned.

Recommended dashboard behavior:

- Separate anomaly alerts from compliance alerts.
- Label them clearly:
  - `Sensor quality issue`
  - `Unusual process behavior`
  - `Compliance breach risk`
- Group repeated anomaly rows into incidents to avoid alert spam.

## Layer 5: Explainability and Governance

The project now produces model governance outputs that backend/frontend teams can surface:

- `model_feature_importance.csv` for top drivers.
- `model_card_summary.json` for intended use and limitations.
- `model_selection_summary.json` for selected models, thresholds, and artifact paths.
- Calibration, walk-forward, incident holdout, and lead-time result files.

Recommended dashboard features:

- Show top drivers for each alert.
- Show model version/artifact timestamp.
- Show whether the alert came from rules, classifier, forecast, anomaly detector, or combined risk logic.
- Keep an audit log of alerts, predictions, thresholds, and acknowledged actions.

## Backend Integration Guidance

Use this file as the primary deployable artifact:

```text
services/ml/models/aquasense_best_models.joblib
```

The backend should load the bundle with `joblib.load` and preserve the exact feature order from the bundle metadata.

Expected bundle contents:

- `metadata`
- `breach_classifier`
- `forecast_models`
- `anomaly_model`
- `classification_results`
- `forecast_results`
- `anomaly_results`
- `feature_importance`

The backend must apply the same preprocessing logic from Notebook 03 before inference. The most important contract is:

- Same feature names.
- Same feature order.
- Same lag/rolling definitions.
- Same imputation strategy.
- No future values.
- No audit-only fields as input features.

Recommended backend endpoints:

- `GET /health`
- `POST /predict/current-compliance`
- `POST /predict/breach-risk`
- `POST /predict/forecasts`
- `POST /predict/anomaly`
- `POST /alerts/evaluate`
- `GET /model/metadata`
- `GET /model/feature-importance`

The `.h5` artifact is available here:

```text
services/ml/models/aquasense_best_models.h5
```

It stores a pickled model bundle inside HDF5 with metadata. Use it only if the demo requirement needs an `.h5` artifact. For normal Python serving, use `.joblib`.

## Frontend Dashboard Guidance

The dashboard should present four separate but connected views:

1. Live Compliance
   - Current readings.
   - Consent/permit limits.
   - Current status.
   - Breach margin.

2. Predictive Risk
   - 30-minute breach risk.
   - Risk level.
   - Lead time.
   - Top drivers.

3. Forecast Trends
   - pH, COD, BOD, TSS, ammonia forecast curves.
   - Current value vs predicted +30 minute value.
   - Limit lines.
   - Forecasted crossings.

4. Anomaly and Data Quality
   - Sensor quality flags.
   - Unusual process behavior.
   - Calibration/maintenance warnings when available.

Recommended alert severity logic:

| Severity | Suggested trigger |
|---|---|
| Green | Current values compliant and future forecasts below limits |
| Watch | Forecast margin narrowing or classifier risk rising |
| Amber | Forecasted limit crossing within 30 minutes or anomaly present |
| Red | Current deterministic rule breach |

## What Not To Claim

Do not claim:

- The model is production-certified.
- The final test split proves breach recall.
- The system knows universal Section 82 limits.
- The anomaly detector alone predicts compliance breaches.
- The `.h5` file is a native Keras/deep-learning model.

Safe claims:

- The architecture is production-minded.
- The preprocessing is leakage-aware.
- The project uses temporal validation and incident-style stress tests.
- Forecasting results are strong enough for a proactive compliance demo.
- The rules engine remains authoritative for current compliance.
- The model bundle can be replaced with real-data-trained models when a facility provides operational data.

## Recommended Next Steps

1. Rerun `notebooks/03_preprocessing.ipynb` whenever raw data or feature logic changes.
2. Rerun `notebooks/04_model_training_evaluation.ipynb` after preprocessing.
3. Backend team loads `services/ml/models/aquasense_best_models.joblib`.
4. Frontend team builds dashboard states around rules, breach risk, forecasts, and anomaly flags.
5. Keep all thresholds configurable per facility.
6. For a real company pilot, collect real sensor data, lab samples, calibration logs, consent limits, and confirmed incident/action records.

## Final Deployment Recommendation

For the demo, deploy all four layers:

- Rules engine for current compliance.
- Forecasting models for +30 minute pollutant values.
- Breach classifier for risk scoring.
- Rule-based anomaly detector for sensor/process quality warnings.

For production, deploy the architecture only after retraining and validating on real facility data. The current prototype is best presented as a trusted, production-shaped system whose data layer can be swapped from simulation/public data to real industrial telemetry.
