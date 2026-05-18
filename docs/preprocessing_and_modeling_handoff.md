# Preprocessing and Modeling Handoff

## What We Have Done

The preprocessing notebook is:

```text
notebooks/03_preprocessing.ipynb
```

It uses the current GitHub-provided project data:

```text
data/raw/direct_sensor_readings.csv
data/raw/lab_results.csv
data/processed/soft_sensor_estimates.csv
data/processed/operational_compliance_dataset.csv
packages/shared/config/demo_limits.json
```

The notebook converts the operational compliance dataset into a leakage-safe modeling matrix for breach prediction and pollutant forecasting.

## Preprocessing Summary

Current preprocessing audit:

| Item | Value |
|---|---:|
| Input rows | 8,640 |
| Regularised rows | 8,640 |
| Supervised rows after warm-up and target filtering | 8,604 |
| Duplicate timestamp rows removed | 0 |
| Inserted missing timestamp rows | 0 |
| Sample interval | 5 minutes |
| Maximum lag window | 120 minutes |
| Maximum prediction horizon | 60 minutes |
| Raw engineered features | 469 |
| Kept model features after filtering | 420 |
| Low-variance features removed | 17 |
| High-correlation features removed | 32 |

Temporal split:

| Split | Rows | Start | End | 30-min breach positive rate |
|---|---:|---|---|---:|
| Train | 6,022 | 2026-05-01 02:00:00 | 2026-05-21 23:45:00 | 0.88% |
| Validation | 1,291 | 2026-05-21 23:50:00 | 2026-05-26 11:20:00 | 0.93% |
| Test | 1,291 | 2026-05-26 11:25:00 | 2026-05-30 22:55:00 | 0.00% |

The zero-positive test window is not a preprocessing error. It is an honest consequence of chronological splitting on the current simulated data. The training/evaluation notebook should report this limitation and use walk-forward or embargoed time-series validation for meaningful breach-recall estimates.

## Leakage-Safe Design Choices

The preprocessing is intentionally conservative.

Predictors use:

```text
real-time sensor values
soft-sensor estimates
lag features
rolling-window statistics
rate-of-change features
compliance-margin features
pollutant-load features
ratio features
time-of-day features
sensor-quality flags
```

Predictors exclude:

```text
future breach labels
current breach outcome labels
lab result columns
post-hoc event_type labels
compliance explanation text
operator recommendation text
value-source metadata
```

Future labels are recomputed so end-of-series rows without a full future horizon are treated as unknown, not silently marked safe.

Imputation and feature filtering are fitted on the training split only. Validation and test rows receive the train-learned transformations.

## Generated Artifacts

The notebook writes reproducible local artifacts:

```text
data/processed/preprocessed_model_matrix.csv
data/processed/preprocessing_feature_manifest.csv
data/processed/preprocessing_train_medians.csv
data/processed/temporal_split_summary.csv
data/processed/preprocessing_audit.json
```

These generated outputs are ignored by Git because the model matrix is large and reproducible from the notebook.

## What We Should Test Next

The next notebook should be the model training and evaluation notebook.

Recommended primary target:

```text
target_breach_next_30min
```

The model comparison should be layered.

### Layer 0: Baselines

Use these to prove lift:

```text
DummyClassifier
LogisticRegression
Persistence baseline for pollutant forecasting
Ridge or LinearRegression for pollutant forecasting
```

### Layer 1: Breach Prediction

Recommended classifiers:

```text
LogisticRegression
RandomForestClassifier
ExtraTreesClassifier
HistGradientBoostingClassifier
```

Optional if we add dependencies later:

```text
LightGBMClassifier
XGBoostClassifier
CatBoostClassifier
```

The best default choice for this MVP is a tree-based model, especially histogram gradient boosting or random forest. The dataset is tabular, feature-engineered, relatively small, and imbalanced. Tree models are fast, strong on nonlinear sensor interactions, and easier to explain than deep learning.

### Layer 2: Pollutant Forecasting

Forecast targets:

```text
target_cod_mg_l_plus_30min
target_tss_mg_l_plus_30min
target_bod_mg_l_plus_30min
target_ammonia_mg_l_plus_30min
target_ph_plus_30min
```

Recommended regressors:

```text
Persistence baseline
Ridge
RandomForestRegressor
ExtraTreesRegressor
HistGradientBoostingRegressor
```

Optional if we add dependencies later:

```text
LightGBMRegressor
XGBoostRegressor
CatBoostRegressor
```

### Layer 3: Anomaly Detection

Recommended anomaly methods:

```text
rule-based sensor quality flags
IsolationForest
LocalOutlierFactor
OneClassSVM
```

IsolationForest is the best first anomaly model because it is available in scikit-learn and fits the project's need to flag abnormal multivariate sensor patterns.

## Why No Deep Learning Yet

Deep learning is not the right center of gravity for this MVP.

Reasons:

```text
only about 8,600 rows
very low breach-positive rate
simulated data
tabular feature-engineered matrix
need for explainability in compliance workflows
hackathon reliability matters more than model novelty
```

A small `MLPClassifier` or `MLPRegressor` can be tested as a neural baseline if desired, but LSTM, Transformer, TimesFM, Chronos, or other deep sequence models should be optional future work rather than the core model.

## Evaluation Plan

For breach prediction, report:

```text
recall
precision
F1
ROC-AUC
PR-AUC
false alarms per day
missed breaches
average early-warning lead time
threshold comparison at 0.35, 0.70, 0.90
```

For forecasting, report:

```text
MAE
RMSE
MAPE where appropriate
comparison against persistence baseline
```

Use temporal validation only:

```text
train split for fitting
validation split for threshold tuning
test split for final reporting
walk-forward validation for more robust breach metrics
optional 60-minute embargo/gap around validation folds
```

Do not use random train/test splits.

