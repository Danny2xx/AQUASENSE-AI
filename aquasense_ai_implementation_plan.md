# AquaSense AI — Wastewater Compliance Platform  
## Comprehensive Implementation Plan for Hackathon MVP

**Challenge theme:** IoT · Data · Compliance  
**Deadline:** Tomorrow  
**Target deliverable:** A working dashboard / monitoring interface, AI or rules-based compliance prediction engine, GitHub repo with README, and short live pitch demo.

---

## 1. Executive Summary

AquaSense AI is a predictive wastewater compliance platform for industrial facilities. It continuously monitors wastewater discharge data, detects current compliance breaches, predicts future breach risk, and automatically generates alerts and compliance reports.

The strongest hackathon implementation should not be a single AI model. It should be a **hybrid compliance intelligence platform** made of four layers:

```text
1. Real-time wastewater sensor stream
2. Deterministic compliance rules engine
3. Predictive machine learning early-warning layer
4. Automated alerting and report generation layer
```

This layered design is important because wastewater compliance cannot rely on machine learning alone. Compliance teams need explicit threshold checks, clear explanations, audit logs, and traceable reports. The AI layer should predict future risk, while the rules engine handles current compliance status.

### Core product statement

> AquaSense AI continuously analyses industrial wastewater sensor data, predicts likely compliance breaches before they occur, and automatically generates alerts and audit-ready reports for compliance teams.

### Correct positioning

Although the challenge brief mentions Section 82, real industrial wastewater compliance is usually based on **site-specific discharge permits or trade-effluent consent limits**. Therefore, the platform should be framed as:

> AquaSense AI predicts breaches against configurable wastewater and trade-effluent consent limits.

This avoids overclaiming one universal legal threshold and makes the system more realistic, investable, and adaptable across facilities.

---

## 2. Why This Project Is Technically Workable

This project is technically workable because it is a standard but high-value form of **multivariate time-series monitoring and forecasting**.

The same pattern appears in:

- patient vital-sign forecasting;
- industrial IoT anomaly detection;
- predictive maintenance;
- water-quality monitoring;
- wastewater treatment plant process control;
- environmental compliance monitoring.

Your previous heart-rate forecasting project is directly relevant because it used timestamped sensor data, missing-value handling, lag features, rolling-window features, and predictive modelling. AquaSense AI applies the same technical pattern to wastewater variables such as pH, COD, BOD, TSS, temperature, ammonia, turbidity, conductivity, dissolved oxygen, and flow rate.

### Transfer from previous project

```text
Heart-rate forecasting project
    heart rate, SpO2, respiration, pulse
    ↓
AquaSense AI
    pH, COD, BOD, TSS, temperature, turbidity, ammonia, flow

Heart-rate next-20-minute forecasting
    ↓
Wastewater next-15/30/60-minute breach prediction

Medical early warning
    ↓
Environmental compliance early warning
```

The domain changes, but the machine learning structure is highly transferable.

---

## 3. Final MVP Scope

The MVP should prove that the system can:

1. stream wastewater sensor data;
2. check compliance against configurable limits;
3. detect abnormal discharge patterns;
4. predict breach risk before the breach happens;
5. display live sensor status in a dashboard;
6. generate automated alerts;
7. generate compliance-style reports;
8. explain why the system raised an alert.

### Minimum viable hackathon deliverable

```text
Next.js + Tailwind frontend
Node.js backend/API gateway
FastAPI machine learning service
Simulated IoT wastewater data stream
Rules-based compliance engine
ML breach prediction model
Anomaly detection module
Automated report generator
Live dashboard
GitHub README
Pitch script
```

### What not to overbuild

Do not spend most of the time trying to build a perfect industrial model. The goal is to show a credible, technically rigorous, working system.

Cut if time becomes tight:

```text
Authentication
Large foundation models
Complex cloud deployment
PDF export
Multi-tenant organisation management
Real payment/auth system
TimescaleDB setup if it slows the team down
Full LLM report generation
```

Do not cut:

```text
Sensor simulation
Rules engine
Breach prediction
Dashboard
Alerts
Reports
README
```

---

## 4. System Architecture

### Recommended architecture

```text
                    ┌──────────────────────────┐
                    │ Simulated IoT Sensor Feed │
                    │ pH, COD, BOD, TSS, temp  │
                    │ turbidity, flow, ammonia │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │ Node.js Backend Gateway   │
                    │ REST + SSE/WebSocket      │
                    │ Alerts + reports API      │
                    └────────────┬─────────────┘
                                 │
                 ┌───────────────┼────────────────┐
                 ▼               ▼                ▼
      ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
      │ PostgreSQL /   │ │ FastAPI ML      │ │ Report/Alert   │
      │ SQLite Demo DB │ │ Service         │ │ Generator      │
      └────────────────┘ └────────────────┘ └────────────────┘
                 │               │
                 ▼               ▼
          historical data   predictions, risk,
                            anomaly score,
                            explanations
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │ Next.js + Tailwind UI     │
                    │ Live dashboard            │
                    │ Risk page                 │
                    │ Alerts page               │
                    │ Reports page              │
                    └──────────────────────────┘
```

### Why split Node.js and FastAPI?

Use **Node.js** for the application backend because it is strong for:

- live data streaming;
- Server-Sent Events or WebSocket connections;
- frontend API routing;
- alert persistence;
- report endpoints;
- user-facing application logic.

Use **FastAPI** for the machine learning service because it is strong for:

- Python model inference;
- scikit-learn / LightGBM / CatBoost integration;
- typed ML request and response schemas;
- rapid API development;
- automatic Swagger/OpenAPI documentation.

Use **Next.js + Tailwind CSS** for the frontend because it allows a polished, fast, modern dashboard without heavy design overhead.

---

## 5. Data Acquisition Strategy

The data strategy must be honest and investable.

### Key point

Public data is useful for validation and credibility, but true industrial effluent data is usually private. That is not a weakness. It is part of the business opportunity.

The real product moat comes from collecting facility-specific data:

```text
sensor telemetry
lab-confirmed pollutant results
site-specific permit/consent limits
production schedules
incident records
maintenance logs
operator interventions
```

### Data categories

#### A. Simulated real-time IoT data for the hackathon demo

This should be the primary demo data source. The challenge allows simulated or real sensor data, so simulation is acceptable as long as it is realistic and transparent.

Minimum columns:

```text
timestamp
facility_id
pH
temperature_c
flow_rate_lps
turbidity_ntu
tss_mg_l
conductivity_us_cm
dissolved_oxygen_mg_l
orp_mv
ammonia_mg_l
uv254_abs
cod_mg_l
bod_mg_l
sensor_status
event_type
```

Derived target columns:

```text
breach_now
breach_next_15min
breach_next_30min
breach_next_60min
risk_level
main_risk_driver
```

#### B. Public data for credibility

Use public datasets in the README and pitch to prove that wastewater and water-quality data exist at meaningful scale.

Relevant public data categories:

- Environment Agency water-quality archive data;
- Environment Agency real-time water-quality monitoring;
- public wastewater treatment plant SCADA datasets;
- wastewater hyperspectral / UV-vis sensor datasets;
- research datasets for COD/BOD prediction.

Public datasets can validate the approach, but they will not fully replace client-specific industrial discharge data.

#### C. Future real client data

Production deployment should collect:

| Data type | Required fields | Why it matters |
|---|---|---|
| Sensor telemetry | timestamp, pH, temperature, flow, turbidity, conductivity, DO, ORP, ammonia | real-time monitoring and early warning |
| Lab samples | COD, BOD, TSS, ammonia, metals, oil/grease | ground truth for soft sensors and compliance |
| Consent limits | site-specific numeric thresholds | defines compliance |
| Process metadata | production schedule, batch cycle, cleaning events | explains discharge patterns |
| Incident records | breach time, cause, corrective action | improves prediction and reporting |
| Maintenance logs | sensor calibration, drift, replacement | avoids false alarms |
| Weather/rainfall | rain events and inflow/infiltration context | useful where drainage affects discharge |
| Operator actions | treatment adjustments, diversion, valve changes | connects alerts to real decisions |

### Investment narrative

> AquaSense AI starts with simulated and public data to prove the architecture. The real commercial value emerges when each facility connects its own sensors, lab results, consent limits, and incident history. That creates proprietary compliance intelligence that generic dashboards cannot replicate.

---

## 6. Sensor and IoT Design

### Practical sensor stack

| Signal | Purpose | Real-world source |
|---|---|---|
| pH | Acid/alkali compliance | pH probe |
| Temperature | Thermal discharge risk | Temperature probe |
| Flow rate | Pollutant load calculation | Flow meter |
| Turbidity | Suspended solids proxy | Turbidity sensor |
| TSS | Solids compliance variable | Lab result, online analyser, or soft sensor |
| Conductivity | Dissolved ion / chemical discharge signal | Conductivity probe |
| Dissolved oxygen | Organic load and biological stress signal | DO probe |
| ORP | Oxidation/reduction condition | ORP probe |
| Ammonia | Toxicity and eutrophication risk | Online analyser / ISE sensor |
| UV254 | Organic-load proxy | UV sensor |
| COD | Organic pollutant measure | Lab, online analyser, or soft sensor |
| BOD | Biodegradable organic pollutant measure | Lab or soft sensor |

### Important technical caveat

COD and BOD are not always simple, cheap, direct IoT probe readings. In many real deployments they are measured by lab tests, online analysers, UV-vis sensors, or estimated using soft-sensor models.

Therefore, AquaSense AI should be designed as **sensor-agnostic**:

```text
Basic version:
    pH, temperature, flow, turbidity, conductivity

Improved version:
    ammonia, dissolved oxygen, ORP, UV254

Advanced version:
    online COD/BOD/TSS analysers, UV-vis spectra, lab-calibrated soft sensors
```

### Product implication

> AquaSense AI can begin with basic probes and become more accurate as facilities add lab-confirmed data, UV-vis measurements, and online analysers.

---

## 7. Simulated Data Generation Plan

### Sampling frequency

Use either:

```text
1-minute intervals for a more realistic IoT stream
or
5-minute intervals for faster modelling and demo stability
```

Recommended hackathon choice:

```text
5-minute intervals over 14 to 30 days
```

This provides enough rows for a convincing experiment while keeping the system lightweight.

### Normal operating ranges

Example baseline ranges:

```text
pH: 6.8–8.4
temperature_c: 18–35
flow_rate_lps: production-cycle dependent
turbidity_ntu: 20–160
tss_mg_l: correlated with turbidity
uv254_abs: correlated with organic load
cod_mg_l: correlated with UV254, turbidity and flow
bod_mg_l: correlated with COD, lagged and smoother
ammonia_mg_l: low baseline with occasional spikes
conductivity_us_cm: varies with dissolved ions and chemical discharge
dissolved_oxygen_mg_l: falls when organic load rises
```

### Incident types to inject

| Event type | Sensor behaviour |
|---|---|
| Organic overload | COD, BOD and UV254 rise gradually |
| Solids washout | Turbidity and TSS spike |
| Cleaning chemical discharge | pH shifts, conductivity rises, COD may rise |
| Acid spill | pH drops below lower limit |
| Alkali spill | pH rises above upper limit |
| Ammonia spike | ammonia rises sharply |
| Thermal discharge | temperature rises |
| Sensor drift | slow monotonic sensor movement |
| Sensor flatline | value stops changing unnaturally |
| Missing burst | 10–60 minutes of missing readings |

### Why inject incidents?

The model needs examples of worsening behaviour before a breach occurs. Without incident injection, the dashboard may look flat and the classifier may have too few breach examples to learn from.

---

## 8. Compliance Rules Engine

### Why it matters

The rules engine is non-negotiable. It provides immediate, explainable compliance status.

The ML model predicts future risk, but the rules engine tells the operator:

```text
Which parameter is currently outside the configured limit?
What is the current value?
What is the limit?
How close is the facility to breaching?
What should the operator check first?
```

### Example configurable limits

These are demo limits and must not be presented as universal legal limits.

```json
{
  "facility_id": "demo-food-processing-plant",
  "limits": {
    "pH_min": 6.0,
    "pH_max": 10.0,
    "temperature_max_c": 43.0,
    "cod_max_mg_l": 1500,
    "bod_max_mg_l": 900,
    "tss_max_mg_l": 800,
    "ammonia_max_mg_l": 180
  },
  "amber_margin_pct": 15
}
```

### Rule outputs

For every timestamp, generate:

```text
compliance_status: GREEN / AMBER / RED
breached_parameters
closest_parameter_to_limit
margin_to_limit_pct
current_breach_reason
recommended_action
```

### Status logic

```text
GREEN:
    all values are comfortably inside limits

AMBER:
    at least one value is within 15% of a limit
    or breach probability exceeds warning threshold
    or anomaly score is elevated

RED:
    at least one current value exceeds a configured limit
    or current sensor value is critically abnormal

RED_PREDICTED:
    no current breach yet, but model predicts high breach probability soon
```

### Example recommended actions

| Risk driver | Recommended action |
|---|---|
| COD rising | inspect organic-load process stream; divert to holding tank |
| pH falling | check acid dosing / chemical spill; neutralise before discharge |
| TSS rising | inspect filtration/settling process; reduce solids discharge |
| ammonia spike | inspect nitrogen-rich waste stream; trigger confirmatory sample |
| temperature rising | check cooling process; pause thermal discharge |
| sensor flatline | inspect sensor and calibration status |

---

## 9. Forensic Data Exploration Plan

Before training any model, run a forensic EDA notebook. This is important because environmental compliance data is only useful if its quality is understood.

### EDA section 1: schema and coverage audit

Check:

```text
number of rows
time range
sampling frequency
missing values
duplicate timestamps
out-of-order timestamps
sensor columns available
lab columns available
target columns available
```

### EDA section 2: sensor validity audit

Check impossible or suspicious values:

```text
pH < 0 or pH > 14
temperature < 0 or temperature > 80
negative COD/BOD/TSS/ammonia
negative flow rate
flatlined sensors
extreme jumps between consecutive readings
```

### EDA section 3: missingness analysis

Analyse:

```text
missingness by column
missingness by time of day
missingness during incidents
consecutive missing gaps
sensor-specific outage frequency
```

### EDA section 4: distribution analysis

Create:

```text
histograms
boxplots
normal vs incident distributions
normal vs breach distributions
log-distributions for COD, BOD, TSS and ammonia
```

### EDA section 5: temporal structure

Analyse:

```text
daily cycles
production-hour effects
autocorrelation
partial autocorrelation
rolling mean
rolling variance
trend
structural breaks
```

### EDA section 6: cross-sensor relationships

Analyse:

```text
COD vs UV254
COD vs turbidity
BOD vs COD
TSS vs turbidity
DO vs COD
conductivity vs pH
flow vs pollutant concentration
flow × concentration pollutant load
```

### EDA section 7: lag relationship analysis

Test whether earlier sensor readings predict future breaches:

```text
corr(sensor_t, breach_t+15)
corr(sensor_t, breach_t+30)
corr(sensor_t, COD_t+30)
corr(rolling_slope_sensor, breach_t+30)
```

### EDA section 8: incident separability

Use:

```text
PCA
UMAP if available
normal vs incident cluster visualisation
feature importance from a shallow tree model
```

### EDA conclusion to include in README

> AquaSense AI performs forensic data profiling before model training to detect missingness, drift, flatlines, outliers, physically impossible readings, sensor inconsistencies, and leakage risk.

---

## 10. Preprocessing Pipeline

### Pipeline sequence

```text
1. Parse timestamps
2. Sort by facility_id and timestamp
3. Enforce regular sampling frequency
4. Resample to 5-minute intervals for demo stability
5. Remove duplicate timestamps
6. Clip or flag physically impossible values
7. Flag sensor faults before imputation
8. Impute short gaps
9. Preserve long gaps as sensor-outage warnings
10. Smooth noisy sensors carefully
11. Generate compliance labels
12. Generate future breach labels
13. Split temporally, never randomly
```

### Missing-value handling

```text
short gap <= 15 minutes:
    interpolate or forward-fill

medium gap 15–60 minutes:
    rolling median or model-based imputation

long gap > 60 minutes:
    do not blindly fill
    flag as sensor outage
```

### Outlier handling

Use a layered approach:

```text
physical range rules
rolling z-score
median absolute deviation
Hampel filter
rate-of-change thresholds
```

Important: do not delete every outlier. In wastewater monitoring, outliers may represent real incidents.

### Data leakage prevention

Do not include features that reveal the future.

Bad features:

```text
breach_next_30min
future_COD
future_TSS
future_BOD
event_type if it is only known after the incident
manual incident label if unavailable in real time
```

---

## 11. Feature Engineering Plan

Feature engineering is the core of this project.

### A. Current sensor features

```text
pH
temperature_c
flow_rate_lps
turbidity_ntu
tss_mg_l
conductivity_us_cm
dissolved_oxygen_mg_l
orp_mv
ammonia_mg_l
uv254_abs
cod_mg_l
bod_mg_l
```

### B. Lag features

For 5-minute sampling:

```text
lag_1 = 5 minutes ago
lag_3 = 15 minutes ago
lag_6 = 30 minutes ago
lag_12 = 60 minutes ago
lag_24 = 120 minutes ago
```

Generate lag features for:

```text
pH
COD
BOD
TSS
turbidity
temperature
ammonia
flow
UV254
conductivity
DO
ORP
```

### C. Rolling-window features

Windows:

```text
15 minutes
30 minutes
60 minutes
120 minutes
```

Statistics:

```text
rolling_mean
rolling_max
rolling_min
rolling_std
rolling_median
rolling_range
```

### D. Rate-of-change features

```text
sensor_delta_5min
sensor_delta_15min
sensor_delta_30min
rolling_slope_30min
percent_change_30min
```

These are critical for early warning because breaches are often preceded by worsening trends.

### E. Compliance-margin features

```text
pH_lower_margin = pH - pH_min
pH_upper_margin = pH_max - pH
COD_margin = COD_limit - COD
BOD_margin = BOD_limit - BOD
TSS_margin = TSS_limit - TSS
ammonia_margin = ammonia_limit - ammonia
temperature_margin = temperature_limit - temperature
min_margin_pct
closest_to_limit_parameter
```

### F. Pollutant load features

Concentration alone is not enough. Load matters.

```text
cod_load = cod_mg_l * flow_rate_lps
bod_load = bod_mg_l * flow_rate_lps
tss_load = tss_mg_l * flow_rate_lps
ammonia_load = ammonia_mg_l * flow_rate_lps
```

### G. Ratio features

```text
bod_cod_ratio = bod_mg_l / cod_mg_l
tss_turbidity_ratio = tss_mg_l / turbidity_ntu
cod_uv254_ratio = cod_mg_l / uv254_abs
do_cod_ratio = dissolved_oxygen_mg_l / cod_mg_l
```

### H. Time features

```text
hour
day_of_week
is_weekend
is_working_hour
sin_hour
cos_hour
sin_day
cos_day
```

### I. Sensor quality features

```text
is_missing_recently
flatline_count_30min
sensor_jump_flag
sensor_drift_score
data_quality_score
```

These features make the system feel production-grade because they show the platform is aware of sensor reliability.

---

## 12. Feature Selection Plan

Do not blindly train on every generated feature.

### Step 1: leakage audit

Remove anything that directly exposes the prediction target.

### Step 2: low-variance filter

Remove features that barely change.

### Step 3: correlation pruning

If two features are almost identical, keep the more interpretable feature.

Example:

```text
turbidity_rolling_mean_30
tss_rolling_mean_30
```

Both may be useful, but if one is only a proxy for the other, simplify where possible.

### Step 4: model-based importance

Use:

```text
LightGBM feature importance
CatBoost feature importance
permutation importance
SHAP values if time permits
```

### Step 5: operational interpretability filter

Prefer features that can be explained to a compliance officer:

```text
COD rising rapidly
pH close to lower limit
TSS rolling maximum above normal
ammonia trend increasing
DO falling while organic load rises
```

---

## 13. Modelling Architecture

Build the intelligence in layers.

---

### Layer 0: Compliance rules engine

Purpose:

```text
Detect current breach
Classify GREEN / AMBER / RED
Explain exact parameter and threshold
```

This layer should work even if the machine learning service fails.

---

### Layer 1: Sensor anomaly detection

Purpose:

```text
Detect abnormal discharge behaviour
Detect sensor faults
Detect spikes, flatlines, drift and missing bursts
```

Recommended models and methods:

```text
Isolation Forest
Robust z-score
Hampel filter
rolling median deviation
rate-of-change thresholds
```

Outputs:

```text
anomaly_score
anomaly_type
affected_sensor
confidence
```

---

### Layer 2: Soft-sensor models

Purpose:

Estimate difficult or delayed lab parameters such as COD, BOD and TSS from continuously available sensors.

Inputs:

```text
pH
temperature
flow
turbidity
conductivity
DO
ORP
ammonia
UV254
lag features
rolling features
rate-of-change features
```

Targets:

```text
COD
BOD
TSS
```

Recommended models:

```text
LightGBMRegressor
CatBoostRegressor
RandomForestRegressor
```

Use this as a strong product claim:

> AquaSense AI can estimate delayed lab-style pollutants from continuous sensor signals, then improve these soft sensors with each facility's lab-confirmed results.

---

### Layer 3: Pollutant forecasting models

Purpose:

Forecast pollutant levels 15, 30 and 60 minutes ahead.

Targets:

```text
COD_t+30
BOD_t+30
TSS_t+30
ammonia_t+30
pH_t+30
temperature_t+30
```

Recommended models:

```text
LightGBMRegressor
CatBoostRegressor
MultiOutputRegressor
RandomForestRegressor
Darts model if time permits
```

For the hackathon, focus on:

```text
COD_t+30
TSS_t+30
pH_t+30
ammonia_t+30
```

---

### Layer 4: Breach prediction classifier

Purpose:

Predict whether a breach will occur within a future window.

Targets:

```text
breach_next_15min
breach_next_30min
breach_next_60min
```

Recommended hackathon target:

```text
breach_next_30min
```

Recommended models:

```text
LightGBMClassifier
CatBoostClassifier
RandomForestClassifier
LogisticRegression baseline
```

### Why this layer matters

A forecast tells you a future value. A breach classifier tells you the operational question:

> Are we likely to breach compliance limits soon?

This is the model that should drive the dashboard's amber and red predicted alerts.

---

### Layer 5: Risk fusion layer

Combine rules, ML predictions and anomaly detection.

Example logic:

```text
if current_breach:
    risk_level = RED

elif breach_probability_next_30min >= 0.70:
    risk_level = RED_PREDICTED

elif breach_probability_next_30min >= 0.35:
    risk_level = AMBER

elif anomaly_score is high:
    risk_level = AMBER_SENSOR_CHECK

else:
    risk_level = GREEN
```

This is the most important product layer because it turns model outputs into operational decisions.

---

## 14. Cutting-Edge Model Options

The system should be reliable first and cutting-edge second.

### Recommended core models

Use these for the actual working MVP:

```text
LightGBM
CatBoost
RandomForest
IsolationForest
```

These are reliable, fast, explainable enough, and easy to deploy.

### Optional advanced models

Add only if the core system is already working:

```text
Darts forecasting models
NeuralForecast NHITS
NeuralForecast PatchTST
TimesFM
Chronos / Chronos-Bolt
```

### Best practical decision

For tomorrow, do not make a large foundation time-series model the core dependency. It increases setup risk.

Recommended pitch wording:

> The MVP uses robust tree-based models for reliable breach prediction and pollutant forecasting. The architecture is designed to support advanced foundation time-series models such as TimesFM or Chronos as optional forecasting backends.

---

## 15. Model Training Plan

### Training dataset creation

1. Generate or load sensor stream.
2. Apply compliance rules to create `breach_now`.
3. Shift `breach_now` into the future to create prediction targets.
4. Generate lag, rolling, slope, margin, ratio and load features.
5. Drop rows with insufficient historical windows.
6. Split temporally.

### Temporal split

Do not randomly split time-series data.

Recommended split:

```text
first 70% = training
next 15% = validation
last 15% = test
```

Alternative:

```text
walk-forward validation
```

### Baseline models

Train simple baselines first:

```text
persistence baseline for forecasting:
    current COD = future COD

logistic regression baseline for breach classification
```

Then train stronger models:

```text
LightGBMClassifier
RandomForestClassifier
CatBoostClassifier
LightGBMRegressor
RandomForestRegressor
CatBoostRegressor
```

### Threshold tuning

For compliance warnings, use probability threshold tuning.

Example:

```text
0.35 = early amber warning
0.70 = serious predicted red warning
0.90 = critical predicted breach
```

Recall is more important than precision for environmental breach detection, but too many false alarms will reduce operator trust.

---

## 16. Model Evaluation Plan

### Classification metrics

For breach prediction:

```text
Recall
Precision
F1 score
ROC-AUC
PR-AUC
false alarms per day
missed breaches
average early-warning lead time
```

### Forecasting metrics

For pollutant forecasting:

```text
MAE
RMSE
MAPE where appropriate
prediction interval coverage if probabilistic
```

### Operational metrics

These are most powerful in the pitch:

```text
average warning time before breach
number of breaches caught before limit exceedance
false alarms per day
percentage of reports auto-generated
time saved versus spreadsheet workflow
```

### Simulated experiment result to include

Use this carefully and label it as simulated.

```text
Simulated proof-of-concept:
- 14 days of 5-minute wastewater telemetry
- sensors: pH, temperature, flow, turbidity, TSS, UV254, COD, BOD, ammonia, DO and conductivity
- incidents: organic overload, solids washout, acid/alkali events, ammonia spike
- target: breach within next 30 minutes
- model: tree-based breach classifier and COD forecaster
```

Result summary:

```text
Breach prediction:
- F1 ≈ 0.98 on simulated test data
- recall ≈ 0.97 at default threshold
- early-warning threshold tuning achieved high recall for currently compliant periods

COD 30-minute forecast:
- ML forecast MAE ≈ 73 mg/L
- naive persistence baseline MAE ≈ 125 mg/L
```

Important caveat:

> These are simulated-data results used to validate the pipeline. Production accuracy requires real facility telemetry, lab samples and consent-specific calibration.

---

## 17. FastAPI ML Service

### Responsibilities

FastAPI should handle:

```text
feature preparation
rules engine checks
model loading
breach prediction
pollutant forecasting
anomaly scoring
explanation generation
```

### Recommended endpoints

```text
GET  /health
GET  /model-info
POST /predict/breach
POST /predict/forecast
POST /predict/anomaly
POST /predict/full
POST /explain
```

### Best endpoint for the dashboard

Use one combined endpoint:

```text
POST /predict/full
```

It should return:

```json
{
  "timestamp": "2026-05-18T11:30:00Z",
  "facility_id": "demo-food-processing-plant",
  "current_status": "AMBER",
  "breach_probability_30min": 0.82,
  "predicted_risk_level": "RED_PREDICTED",
  "predicted_breach_parameter": "COD",
  "forecast": {
    "cod_mg_l_t_plus_30": 1650,
    "tss_mg_l_t_plus_30": 720,
    "pH_t_plus_30": 7.2,
    "ammonia_mg_l_t_plus_30": 95
  },
  "anomaly_score": 0.71,
  "top_drivers": [
    "COD rolling slope increasing",
    "UV254 elevated",
    "flow rate rising",
    "dissolved oxygen falling"
  ],
  "recommended_action": "Inspect organic-load process stream and divert discharge if COD continues rising."
}
```

---

## 18. Node.js Backend

### Responsibilities

Node.js should act as the application backend and real-time data gateway.

It should handle:

```text
loading the simulated sensor CSV
streaming readings every 1–2 seconds
calling the FastAPI ML service
saving latest readings and predictions
serving frontend API routes
sending live updates through SSE or WebSockets
generating and storing alerts
calling report-generation logic
```

### Recommended endpoints

```text
GET  /api/facilities
GET  /api/facilities/:id/latest
GET  /api/facilities/:id/history
GET  /api/facilities/:id/alerts
POST /api/facilities/:id/limits
POST /api/reports/generate
GET  /api/reports/:id
GET  /api/stream/live
```

### Streaming choice

Use **Server-Sent Events** for speed unless the team is already comfortable with WebSockets.

SSE is enough because the dashboard mostly needs one-way live updates from backend to frontend.

---

## 19. Database Design

For the hackathon, use SQLite if speed matters. Use PostgreSQL if the team can set it up quickly.

### Table: `sensor_readings`

```sql
id
facility_id
timestamp
pH
temperature_c
flow_rate_lps
turbidity_ntu
tss_mg_l
conductivity_us_cm
dissolved_oxygen_mg_l
orp_mv
ammonia_mg_l
uv254_abs
cod_mg_l
bod_mg_l
sensor_status
created_at
```

### Table: `compliance_limits`

```sql
id
facility_id
parameter
lower_limit
upper_limit
unit
amber_margin_pct
source
active
created_at
```

### Table: `predictions`

```sql
id
facility_id
timestamp
breach_probability_15min
breach_probability_30min
breach_probability_60min
predicted_parameter
risk_level
model_version
top_drivers_json
created_at
```

### Table: `alerts`

```sql
id
facility_id
timestamp
severity
parameter
message
current_value
limit_value
predicted_value
status
created_at
```

### Table: `reports`

```sql
id
facility_id
start_time
end_time
summary
incidents_json
generated_by
created_at
```

---

## 20. Next.js + Tailwind Frontend

### Page 1: `/dashboard`

Live compliance cockpit.

Components:

```text
Overall compliance status card
Breach probability card
Current pH card
Current COD card
Current TSS card
Current ammonia card
Live sensor line charts
Compliance limit overlays
Forecast horizon overlay
```

### Page 2: `/risk`

Predictive AI page.

Show:

```text
breach probability gauge
top predicted breach parameter
estimated time to breach
top model drivers
forecast vs limit chart
risk history
```

### Page 3: `/alerts`

Alert centre.

Show:

```text
active alerts
resolved alerts
severity
parameter
timestamp
current value
limit value
recommended action
```

### Page 4: `/reports`

Automated compliance reporting.

Show:

```text
generate report button
latest incident summary
report history
copy/export report text
```

### Page 5: `/data-quality`

This page will impress judges.

Show:

```text
sensor health
missing data warnings
flatline detection
outlier warnings
last reading timestamp
sensor status summary
```

---

## 21. Dashboard Design Priorities

The UI should look like an industrial monitoring cockpit.

### Colour system

```text
Green = compliant
Amber = warning
Red = breach or predicted breach
Neutral/blue/grey = normal sensor data
```

### Key cards

```text
Overall Compliance: AMBER
Predicted Breach: COD in 27 min
Breach Probability: 82%
Most Important Driver: UV254 rising rapidly
Recommended Action: Inspect organic load / divert discharge / increase treatment
```

### Core charts

```text
COD over time with limit line
pH over time with safe band
TSS over time with limit line
Ammonia over time with limit line
Breach probability over time
Anomaly score over time
```

### Demo moment

The best demo moment is when the platform changes from:

```text
GREEN → AMBER → RED_PREDICTED → RED
```

before the actual breach occurs.

---

## 22. Automated Report Generation

The report can be template-based. It does not need a large language model.

### Example report

```text
AquaSense AI Incident Report

Facility: Demo Food Processing Plant
Time window: 10:00–11:00
Status: Predicted compliance breach
Parameter: COD
Current value: 1420 mg/L
Forecast value in 30 min: 1650 mg/L
Configured limit: 1500 mg/L
Breach probability: 82%

Key drivers:
1. UV254 increased by 34% over 30 minutes
2. COD rolling slope is rising
3. Dissolved oxygen is falling
4. Flow rate increased during production cycle

Recommended action:
- Inspect high-organic-load process stream
- Divert discharge to holding tank
- Increase treatment/aeration
- Trigger manual sample confirmation

Data quality:
- No sensor flatline detected
- No missing readings in the last 30 minutes
- Sensor stream confidence: High
```

### Why this matters

Manual compliance workflows often depend on spreadsheets, delayed reports, and human interpretation. Automated structured reports show how AquaSense AI turns sensor events into operational documentation.

---

## 23. Repository Structure

Recommended repo layout:

```text
aquasense-ai/
│
├── README.md
├── docker-compose.yml
├── .env.example
│
├── data/
│   ├── simulated/
│   │   └── wastewater_stream.csv
│   ├── limits/
│   │   └── demo_limits.json
│   └── reports/
│
├── ml-service/
│   ├── app/
│   │   ├── main.py
│   │   ├── schemas.py
│   │   ├── predict.py
│   │   ├── rules.py
│   │   ├── anomaly.py
│   │   └── feature_pipeline.py
│   ├── training/
│   │   ├── simulate_data.py
│   │   ├── forensic_eda.ipynb
│   │   ├── train_models.py
│   │   └── evaluate_models.py
│   ├── models/
│   │   ├── breach_classifier.pkl
│   │   ├── cod_forecaster.pkl
│   │   └── anomaly_detector.pkl
│   └── requirements.txt
│
├── backend/
│   ├── src/
│   │   ├── server.js
│   │   ├── routes/
│   │   ├── services/
│   │   ├── stream/
│   │   └── reports/
│   ├── package.json
│   └── prisma/
│
└── frontend/
    ├── app/
    │   ├── dashboard/
    │   ├── risk/
    │   ├── alerts/
    │   ├── reports/
    │   └── data-quality/
    ├── components/
    ├── lib/
    ├── package.json
    └── tailwind.config.js
```

---

## 24. Implementation Order for Tomorrow

### Phase 1: Data and model first

Build:

```text
simulate_data.py
rules.py
feature_pipeline.py
train_models.py
evaluate_models.py
```

Deliver:

```text
simulated wastewater CSV
trained breach classifier
trained COD forecaster
trained anomaly detector
evaluation metrics JSON
```

Do not start the frontend until the data/model pipeline works.

---

### Phase 2: FastAPI ML service

Build:

```text
GET /health
POST /predict/full
```

The combined endpoint should return:

```text
current compliance status
breach probability
forecast values
anomaly score
top drivers
recommended action
```

---

### Phase 3: Node.js backend

Build:

```text
load simulated CSV
stream one row every 1–2 seconds
call FastAPI prediction endpoint
store latest reading and prediction
send live updates to frontend
create alerts when risk changes
```

Use SSE unless WebSocket implementation is already comfortable.

---

### Phase 4: Next.js dashboard

Build the core pages only:

```text
/dashboard
/risk
/alerts
/reports
```

Add `/data-quality` if time allows.

---

### Phase 5: README and pitch

The README should include:

```text
problem
solution
architecture
data strategy
sensor strategy
model strategy
how to run
screenshots
example API response
demo flow
limitations
future work
```

---

## 25. Suggested README Summary

Use this in the GitHub README.

```text
AquaSense AI is a predictive wastewater compliance platform that continuously monitors simulated industrial IoT sensor data, checks readings against configurable discharge limits, predicts likely compliance breaches 30 minutes ahead, and automatically generates alerts and incident reports.

The prototype combines a deterministic compliance rules engine, machine learning breach prediction, pollutant forecasting, anomaly detection, and a live dashboard. It is designed to move industrial wastewater management from delayed lab-based reaction to real-time environmental risk prevention.

The MVP uses simulated wastewater telemetry to demonstrate the system architecture. In production, AquaSense AI would connect to facility-specific sensors, laboratory results, discharge consent limits, maintenance logs, and incident records to create a calibrated compliance intelligence system.
```

---

## 26. Suggested Pitch Structure

### 30-second opening

```text
Every day, industrial facilities discharge wastewater, but many only discover compliance issues after lab results return or after damage has already occurred. AquaSense AI changes that by turning wastewater compliance into a real-time predictive system.
```

### Problem

```text
Current compliance workflows are delayed, manual and reactive. Teams rely on spreadsheets, manual testing and lab reports. By the time a breach is discovered, environmental damage, fines and shutdowns may already be unavoidable.
```

### Solution

```text
AquaSense AI continuously monitors wastewater sensor data, checks readings against configurable limits, predicts likely breaches 30 minutes ahead, and automatically generates alerts and audit-ready reports.
```

### Technical approach

```text
The platform combines four layers: a rules engine for current compliance, an anomaly detector for abnormal discharge and sensor faults, a machine learning model for breach prediction, and a reporting engine that turns alerts into structured compliance records.
```

### Demo flow

```text
1. Show live wastewater dashboard.
2. Show normal green status.
3. Let simulated COD/UV254/TSS rise.
4. Show amber warning before the limit is breached.
5. Show predicted red breach.
6. Open generated incident report.
7. Explain that production deployment would use real sensors, lab samples and site-specific limits.
```

### Closing

```text
AquaSense AI is not just a dashboard. It is a compliance intelligence layer for industrial wastewater, designed to help facilities prevent environmental harm before it happens.
```

---

## 27. Technical Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Public datasets are not consent-specific | Use simulated demo data and clearly state production requires facility-specific data |
| COD/BOD are not always real-time direct sensors | Use soft-sensor modelling and lab calibration strategy |
| Too many false alarms | Use threshold tuning and separate amber/red alert levels |
| ML model overclaims accuracy | Label simulated results clearly and focus on architecture viability |
| Sensor faults cause wrong alerts | Add data-quality and anomaly detection layer |
| Deadline too short | Prioritise working rules engine, simulated data, breach classifier and dashboard |

---

## 28. Final Build Checklist

### Must-have

```text
[ ] Simulated wastewater data generator
[ ] Configurable compliance limits JSON
[ ] Rules engine
[ ] Feature engineering pipeline
[ ] Breach prediction model
[ ] COD/TSS/pH forecast model
[ ] Anomaly detector
[ ] FastAPI prediction endpoint
[ ] Node.js live stream backend
[ ] Next.js dashboard
[ ] Alert page
[ ] Report generator
[ ] README
[ ] Demo script
```

### Nice-to-have

```text
[ ] Data-quality page
[ ] SHAP explanation
[ ] Downloadable report
[ ] Docker Compose
[ ] Public dataset notebook
[ ] TimesFM or Darts comparison
[ ] Multi-facility selector
```

---

## 29. Recommended Technology Stack

### Machine learning

```text
Python
pandas
numpy
scikit-learn
LightGBM
CatBoost if setup is smooth
joblib
FastAPI
uvicorn
```

### Backend

```text
Node.js
Express or Fastify
Server-Sent Events
SQLite or PostgreSQL
Prisma optional
```

### Frontend

```text
Next.js
React
Tailwind CSS
Recharts
Lucide icons
```

### Deployment/demo

```text
local machine demo
Docker Compose if time permits
Vercel for frontend only if backend is separately hosted
Render/Fly.io/Railway optional for backend
```

For the hackathon, local deployment is acceptable if the live demo is reliable.

---

## 30. Final Technical Narrative

Use this as the guiding explanation for the entire project:

> AquaSense AI uses a hybrid AI architecture. The rules engine detects current compliance breaches against configurable consent limits. The machine learning layer learns from sensor history to predict breaches before they occur. The anomaly layer catches abnormal discharge patterns and sensor faults. The reporting layer converts every alert into an audit-ready compliance record. Together, these layers move wastewater management from delayed lab-based reaction to real-time environmental risk prevention.

---

## 31. Final Verdict

AquaSense AI is highly suitable for the hackathon because it is:

```text
technically feasible
visually demonstrable
high-impact
compliance-relevant
data-driven
AI-enabled but not AI-dependent
investable if positioned around facility-specific data
```

The best version for tomorrow is:

```text
simulated IoT stream
+ compliance rules engine
+ breach prediction classifier
+ pollutant forecaster
+ anomaly detector
+ automated report generator
+ polished dashboard
```

The strongest investment claim is:

> The simulated and public data prove the system pattern. The real value comes when facilities connect their own sensors, lab samples, consent limits and incident history. That creates proprietary compliance intelligence that generic dashboards cannot replicate.

---

## 32. Reference Notes for Further Research

Use these sources in the final README or presentation if needed:

1. Environment Agency Water Quality Archive — public water-quality measurements and API access.  
   https://www.api.gov.uk/ea/water-quality/

2. Environment Agency water-quality data services.  
   https://environment.data.gov.uk/

3. UCI Water Treatment Plant dataset.  
   https://archive.ics.uci.edu/dataset/106/water+treatment+plant

4. Agtrup / BlueKolding wastewater treatment plant SCADA dataset.  
   https://data.mendeley.com/datasets/34rpmsxc4z/1

5. Scientific Data wastewater quality monitoring dataset with hyperspectral and UV-vis sensing.  
   https://www.nature.com/articles/s41597-025-05459-x

6. Scientific Reports paper on COD prediction in industrial wastewater treatment plants.  
   https://www.nature.com/articles/s41598-024-64634-z

7. FastAPI documentation.  
   https://fastapi.tiangolo.com/

8. Next.js App Router documentation.  
   https://nextjs.org/docs/app

9. Tailwind CSS documentation.  
   https://tailwindcss.com/

10. Google Research TimesFM.  
    https://github.com/google-research/timesfm

