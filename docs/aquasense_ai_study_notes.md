# AquaSense AI Study Notes

These notes summarize the important design clarifications behind the AquaSense AI MVP. Use them as a reference for reports, pitch preparation, and future production thinking.

## 1. Core Product Idea

AquaSense AI is a predictive wastewater compliance platform for industrial facilities.

It combines:

- real-time wastewater sensor monitoring
- deterministic compliance rules
- soft-sensor estimation for hard-to-measure pollutants
- breach prediction across 15, 30, and 60-minute horizons
- alerting, explanation, and reporting

The strongest framing is:

> AquaSense AI predicts breaches against configurable wastewater and trade-effluent consent limits.

This is better than claiming one universal legal threshold, because real facilities usually operate under site-specific discharge permits or trade-effluent consent limits.

## 2. Consent Limits and Status Logic

Consent limits define whether the discharge is acceptable for a specific facility.

Current demo limits:

| Parameter | Demo limit |
|---|---:|
| pH | 6.0 to 10.0 |
| Temperature | max 43.0 C |
| COD | max 1500 mg/L |
| BOD | max 900 mg/L |
| TSS | max 800 mg/L |
| Ammonia | max 180 mg/L |

Dashboard classifications:

| Status | Meaning |
|---|---|
| GREEN / OK | Value is comfortably inside the consent limit |
| AMBER / Warning | Value is within 15% of a limit |
| RED / Breach | Value exceeds a consent limit |

Examples:

| Parameter | OK | Warning | Breach |
|---|---:|---:|---:|
| pH low | above 6.9 | 6.0 to 6.9 | below 6.0 |
| pH high | below 8.5 | 8.5 to 10.0 | above 10.0 |
| Temperature | below 36.55 C | 36.55 to 43 C | above 43 C |
| COD | below 1275 mg/L | 1275 to 1500 mg/L | above 1500 mg/L |
| BOD | below 765 mg/L | 765 to 900 mg/L | above 900 mg/L |
| TSS | below 680 mg/L | 680 to 800 mg/L | above 800 mg/L |
| Ammonia | below 153 mg/L | 153 to 180 mg/L | above 180 mg/L |

The rules engine answers:

> Are we breaching right now?

The ML layer answers:

> Are we likely to breach soon?

## 3. Prediction Time Frames

The MVP uses three prediction horizons:

| Horizon | Product meaning |
|---|---|
| 15 minutes | Immediate risk |
| 30 minutes | Operational risk |
| 60 minutes | Trend risk |

This is credible because industrial response times vary. Some issues, such as pH shocks or ammonia spikes, need fast attention. Other problems, such as COD/BOD/TSS trends, may build more gradually.

Recommended dashboard language:

```text
15-min Risk: Immediate warning
30-min Risk: Operational action window
60-min Risk: Trend risk
```

If the product needs one primary headline prediction, use the 30-minute horizon.

## 4. COD and BOD Realism

COD and BOD should not be presented as simple direct real-time probe readings.

Direct or near-real-time sensors include:

- pH
- temperature
- flow rate
- turbidity
- conductivity
- dissolved oxygen
- ORP
- ammonia
- UV254

Harder-to-measure values include:

- COD
- BOD
- TSS

In a production-style pipeline, COD/BOD/TSS can come from:

- online analysers
- lab-confirmed samples
- soft-sensor estimates calibrated from proxy signals

The current notebook now separates the data like this:

```text
raw direct sensors
-> soft-sensor estimates for COD/BOD/TSS
-> sparse lab-confirmed samples
-> operational compliance dataset
-> model-ready training dataset
```

This makes the project more credible than pretending COD and BOD are always direct IoT readings.

## 5. Soft-Sensor Framing

A soft sensor estimates a hard-to-measure variable using easier-to-measure signals.

In AquaSense AI:

```text
UV254 + turbidity + conductivity + dissolved oxygen + pH + temperature + flow
-> estimated COD/BOD/TSS
```

Then lab values are used as ground truth when available.

The right pitch framing:

> AquaSense AI does not pretend COD and BOD are simple real-time probe values. It estimates them from online sensors, then continuously validates and recalibrates those estimates against lab-confirmed samples.

Important distinction:

```text
Soft-sensor estimates:
    useful for trend monitoring, early warning, and operational decisions

Lab-confirmed values:
    ground truth for compliance confirmation and calibration
```

Soft sensors should not be framed as replacing lab tests for legally binding evidence.

## 6. Lab vs Estimate Validation

The notebook compares estimated COD/BOD/TSS against sparse lab-confirmed samples.

Current validation metrics:

| Metric | COD | BOD | TSS |
|---|---:|---:|---:|
| MAE | 45.149 | 29.666 | 14.351 |
| RMSE | 56.595 | 36.316 | 17.950 |
| MAPE | 5.635% | 7.107% | 4.167% |
| R2 | 0.913 | 0.879 | 0.976 |

These are not bad. They are strong for a soft-sensor early-warning system.

Why:

```text
COD MAE around 45 mg/L versus a 1500 mg/L limit is about 3% of the limit.
BOD MAE around 30 mg/L versus a 900 mg/L limit is about 3.3% of the limit.
TSS MAE around 14 mg/L versus an 800 mg/L limit is about 1.8% of the limit.
```

The honest interpretation:

> The estimates are good enough for early warning and risk ranking, but lab tests remain the compliance ground truth.

## 7. Research Basis for Soft Sensors

The soft-sensor idea is supported by published wastewater and water-quality research.

Useful references:

- Li et al., UV-Vis spectroscopy calibration for online COD estimation: https://doi.org/10.1039/C9RA10732K
- Water Research sensor fusion using UV/Vis spectroscopy and turbidity for COD/TSS/oil-grease monitoring: https://doi.org/10.1016/j.watres.2011.12.005
- Wastewater soft-sensor work for COD/BOD prediction: https://pubmed.ncbi.nlm.nih.gov/39629300/

This gives the MVP a stronger technical story:

> The platform follows a known industrial pattern: fast online proxy measurements, soft-sensor estimation, and lab-based calibration.

## 8. Simulated Incidents

The incidents in the notebook are simulated operational causes.

They are not the compliance labels themselves. They explain why warnings or breaches occur.

Examples:

| Incident | Sensor behaviour | Possible status |
|---|---|---|
| organic_overload | UV254 and turbidity rise, dissolved oxygen falls, estimated COD/BOD rise | warning or breach |
| solids_washout | turbidity rises, estimated TSS rises | warning or breach |
| acid_spill | pH drops | warning or breach |
| alkali_spill | pH rises | warning or breach |
| ammonia_spike | ammonia rises sharply | warning or breach |
| thermal_discharge | temperature rises | warning or breach |
| sensor_drift | conductivity slowly drifts | warning or data-quality concern |

Example flow:

```text
Incident: acid_spill
Sensor effect: pH drops over time
Rules engine: pH approaches or falls below 6.0
Dashboard: AMBER or RED
Explanation: pH low
Recommended action: check acid dosing or chemical spill; neutralise before discharge
```

In production, incident labels should come from real site history.

Real incident sources include:

- operator logs
- maintenance logs
- batch production records
- cleaning-in-place events
- chemical dosing records
- spill reports
- diversion tank events
- sensor calibration records
- lab sample notes
- permit breach investigations
- SCADA alarms

Production value:

> AquaSense AI gets more accurate as each facility connects sensor telemetry, lab results, consent limits, operator logs, and incident history.

## 9. Prediction Targets

The prediction target columns are:

```text
breach_next_15min
breach_next_30min
breach_next_60min
```

They answer:

> Will a compliance breach happen soon?

Because the data is sampled every 5 minutes:

```text
15 minutes = 3 rows
30 minutes = 6 rows
60 minutes = 12 rows
```

The target logic:

```text
Look forward from the current timestamp.
Check the next 3, 6, or 12 rows.
If any future row has breach_now = True, mark the current row True.
Otherwise mark it False.
```

Example:

```text
Time     breach_now
10:00    False
10:05    False
10:10    False
10:15    True
```

At 10:00:

```text
breach_next_15min = True
```

Because a breach happens at 10:15, which is within the next 15 minutes.

Key distinction:

```text
breach_now = what is happening right now
breach_next_15min = whether a breach is coming soon
breach_next_30min = whether operators need to act this cycle
breach_next_60min = whether the trend is becoming unsafe
```

This turns the dataset from monitoring into prediction.

## 10. Model-Ready Features

The data acquisition notebook creates a simple model-ready dataset. It does not do deep exploration.

Feature columns include direct sensors and operational compliance values:

```text
pH
temperature
flow
turbidity
conductivity
dissolved oxygen
ORP
UV254
ammonia for compliance
TSS for compliance
COD for compliance
BOD for compliance
```

COD/BOD/TSS for compliance mean:

```text
lab-confirmed if available
otherwise soft-sensor estimate
```

The notebook adds two simple time-series features for each variable:

```text
lag_5min
rolling_30min_mean
```

`lag_5min` means:

> What was this value one reading ago?

Since the dataset is sampled every 5 minutes, one row ago equals 5 minutes ago.

`rolling_30min_mean` means:

> What was the average value over the last 30 minutes?

Since:

```text
6 readings x 5 minutes = 30 minutes
```

These features help the model understand recent direction and sustained trends.

## 11. Notebook Separation

The data acquisition notebook should stay focused and reproducible.

Recommended notebook structure:

| Notebook | Purpose |
|---|---|
| 01_data_acquisition.ipynb | Create and save pipeline data |
| 02_time_series_eda.ipynb | Explore time-series quality, trends, incidents, seasonality, Fourier analysis, and missingness |
| 03_model_training.ipynb | Train soft-sensor and breach prediction models |
| 04_model_evaluation.ipynb | Evaluate lead time, false alarms, accuracy, and dashboard thresholds |

Good topics for the time-series EDA notebook:

- time coverage audit
- sampling frequency checks
- missingness by sensor and time
- flatline detection
- sensor drift detection
- rolling volatility
- incident window plots
- Fourier analysis
- seasonality and production-cycle analysis
- cross-correlation between UV254/turbidity and COD/BOD estimates
- breach lead-time analysis
- target leakage checks

The current data acquisition notebook is intentionally not chart-heavy. It creates clean data artifacts for the rest of the pipeline.

## 12. Best Presentation Angle

The standout message:

> AquaSense AI is not just a dashboard. It is a compliance intelligence layer that combines real-time sensors, soft-sensor estimation, lab calibration, deterministic rules, and predictive breach warnings.

The best technical story:

```text
1. Direct sensors measure what is available in real time.
2. Soft sensors estimate COD/BOD/TSS from proxy signals.
3. Lab samples validate and recalibrate those estimates.
4. Rules detect current breaches against consent limits.
5. ML predicts breach risk 15, 30, and 60 minutes ahead.
6. The dashboard explains the driver and recommends an action.
```

High-confidence pitch line:

> We do not replace lab compliance testing. We give operators earlier visibility, better prioritisation, and a defensible data trail before breaches happen.
