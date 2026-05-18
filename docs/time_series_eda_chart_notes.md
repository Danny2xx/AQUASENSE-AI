# Time-Series EDA Chart Notes

These notes explain the most presentation-worthy charts from `notebooks/02_time_series_eda.ipynb`.

Use this file while studying, building slides, or writing reports. The goal is to make each chart easy to explain in plain language.

## 1. Sampling Interval Distribution

### What The Chart Shows

This chart checks how often sensor readings arrive.

The x-axis shows the time gap between consecutive readings. The y-axis shows how many times each gap occurs.

In our data, there is one dominant bar at:

```text
5.0 minutes
```

### How To Interpret It

This means the sensor stream is sampled consistently every 5 minutes:

```text
00:00
00:05
00:10
00:15
...
```

### Why It Matters

Our prediction targets depend on this cadence:

```text
15 minutes = 3 rows
30 minutes = 6 rows
60 minutes = 12 rows
```

If the sampling interval were irregular, then 3 rows would not always equal 15 minutes. That would make the prediction labels less reliable.

### Presentation Line

> The telemetry has a clean 5-minute cadence, which makes the 15, 30, and 60-minute prediction windows valid.

## 2. Direct Sensor Time-Series Charts

### What The Charts Show

Each direct sensor is plotted separately over the full month.

The blue line is the real-time sensor value. The shaded bands show simulated incident windows.

Direct sensors include:

- pH
- temperature
- flow rate
- turbidity
- conductivity
- dissolved oxygen
- ammonia
- UV254

### How To Interpret Them

The charts show two things:

```text
normal operating cycles
and
abnormal incident behaviour
```

Normal cycles appear as repeating daily patterns. These are realistic for industrial sites because production, cleaning, and low-flow periods often follow a daily rhythm.

Incidents appear as sharp spikes, drops, or drifts.

### Incident Fingerprints

| Incident | Main chart to inspect | Pattern |
|---|---|---|
| Acid spill | pH | pH drops |
| Alkali spill | pH | pH rises |
| Thermal discharge | temperature | temperature spikes |
| Sensor drift | conductivity | conductivity slowly shifts or rises |
| Ammonia spike | ammonia | ammonia spikes upward |
| Solids washout | turbidity | turbidity rises sharply |
| Organic overload | UV254, turbidity, dissolved oxygen | UV254/turbidity rise and oxygen falls |

### Why It Matters

This proves the synthetic data is not random. It has:

```text
realistic normal operation
and
interpretable abnormal events
```

The model needs both to learn useful early-warning behaviour.

### Presentation Line

> The direct sensor stream contains normal daily process cycles plus clear incident fingerprints, which gives the model realistic patterns to learn from.

## 3. Event Type Counts

### What The Chart Shows

This chart counts how many rows belong to each event type.

Most rows are normal operation. Incident rows are much rarer.

### How To Interpret It

This matches real industrial monitoring:

```text
Most of the time, the site is operating normally.
Incidents happen occasionally.
```

### Why It Matters

The model must learn rare but important abnormal patterns without treating every normal daily fluctuation as a problem.

### Presentation Line

> The dataset is mostly normal operation, with a smaller number of high-value incident windows for early-warning learning.

## 4. Incident Windows Across The Month

### What The Chart Shows

This timeline shows when each incident happens during the month.

Each horizontal bar is one incident window.

### How To Interpret It

It helps connect abnormal sensor behaviour to a known simulated cause.

For example:

```text
ammonia_spike window
-> check ammonia chart
-> ammonia should rise sharply
```

### Why It Matters

In production, these incident windows would come from operator logs, SCADA alarms, maintenance records, or breach investigations.

### Presentation Line

> The incident timeline connects sensor anomalies to operational causes, which is essential for explainable alerts.

## 5. Event Impact Profile Heatmap

### What The Chart Shows

This heatmap compares median sensor values during incidents against normal operation.

Values are shown as percentage changes from the normal median.

### How To Interpret It

Strong positive or negative cells show which sensors are affected by each incident.

Examples:

```text
acid_spill -> pH decreases
thermal_discharge -> temperature increases
solids_washout -> turbidity increases
organic_overload -> UV254 and turbidity increase
```

### Why It Matters

This chart confirms that incident labels have physically sensible fingerprints.

### Presentation Line

> Each incident type creates a distinct sensor signature, which supports explainable classification and alerting.

## 6. Compliance Status Counts

### What The Chart Shows

This chart counts how many rows are:

```text
GREEN
AMBER
RED
```

### How To Interpret It

Most rows are GREEN. AMBER and RED rows are much rarer.

This is realistic because industrial sites are usually compliant most of the time, but occasional events can push readings near or beyond consent limits.

### Why It Matters

The system needs to be sensitive to rare breaches without creating too many false alarms.

### Presentation Line

> Compliance breaches are rare but high impact, so the system is designed for early warning rather than simple status monitoring.

## 7. Compliance Variables Against Consent Limits

### What The Chart Shows

These charts compare selected compliance values against their consent limits.

The sensor value is plotted over time. The dashed red line shows the limit.

### How To Interpret It

When a value approaches the red line, it becomes a warning.

When it crosses the red line, it becomes a breach.

Examples:

```text
pH below lower limit -> acid risk
temperature above max -> thermal discharge risk
ammonia above max -> ammonia breach risk
COD above max -> organic load breach risk
```

### Why It Matters

This is the rules-engine layer. It gives operators a clear and auditable reason for GREEN, AMBER, or RED status.

### Presentation Line

> The rules engine provides immediate explainability by comparing values directly against site-specific consent limits.

## 8. Most Common Main Risk Drivers

### What The Chart Shows

This chart shows which parameter is most often closest to its consent limit.

Examples of risk drivers:

```text
pH low
pH high
COD
BOD
TSS
ammonia
temperature
```

### How To Interpret It

The main risk driver is the parameter the operator should pay attention to first.

It does not always mean there is a breach. It means that parameter is the closest to becoming problematic.

### Why It Matters

This powers dashboard explanations and recommended actions.

### Presentation Line

> Instead of only showing a risk score, AquaSense identifies the main driver behind the risk and recommends an action.

## 9. Future Breach Target Positive Rates

### What The Chart Shows

This chart shows how often each future breach target is true:

```text
breach_next_15min
breach_next_30min
breach_next_60min
```

### How To Interpret It

The bars show the percentage of rows followed by a breach within each future window.

The 60-minute target is highest because a longer window gives more opportunity for a breach to occur.

Example:

```text
10:00 now
10:45 breach occurs
```

At 10:00:

```text
breach_next_15min = False
breach_next_30min = False
breach_next_60min = True
```

### Why It Matters

This shows breach prediction is a rare-event problem.

Most rows are normal. Only a small fraction are pre-breach warning moments.

That means model evaluation should use:

- recall
- precision
- F1 score
- PR-AUC
- false alarm rate
- lead time before breach

Accuracy alone would be misleading.

### Presentation Line

> Future breaches are rare, so this is a rare-event early-warning problem, not a standard accuracy-maximisation task.

## 10. Lab vs Estimate Scatter Plots

### What The Charts Show

These charts compare soft-sensor estimates against lab-confirmed values for:

```text
COD
BOD
TSS
```

The diagonal line represents perfect agreement.

### How To Interpret Them

Points close to the diagonal mean the estimate is close to the lab result.

Points far from the diagonal mean the estimate has more error.

### Why It Matters

COD, BOD, and TSS are not treated as simple real-time probe values.

Instead:

```text
real-time sensors -> soft-sensor estimates -> lab validation
```

### Presentation Line

> We estimate COD, BOD, and TSS from online proxy sensors, then validate the estimates against lab-confirmed samples.

## 11. Soft-Sensor Error Distribution

### What The Chart Shows

This chart shows the distribution of estimation errors:

```text
estimate - lab value
```

The zero line means perfect agreement.

### How To Interpret It

Errors close to zero are better.

If the box is mostly above zero, the estimate tends to overestimate.

If the box is mostly below zero, the estimate tends to underestimate.

### Why It Matters

In production, this chart would help detect calibration drift.

If estimates start becoming biased over time, the soft sensor should be recalibrated.

### Presentation Line

> Lab comparisons allow the platform to monitor soft-sensor bias and recalibrate when needed.

## 12. Operational Value Source Mix

### What The Chart Shows

This chart shows how often values come from:

```text
lab_confirmed
soft_sensor_estimate
online_sensor
```

### How To Interpret It

Most COD/BOD/TSS rows come from soft-sensor estimates because lab samples are sparse.

Some rows are lab-confirmed when lab results are available.

Ammonia can come from an online sensor or lab confirmation.

### Why It Matters

The dashboard should show whether a value is estimated or lab-confirmed. That makes the system more transparent and trustworthy.

### Presentation Line

> AquaSense separates estimated values from lab-confirmed values, so users know the source and confidence of each compliance indicator.

## 13. Correlation Matrix

### What The Chart Shows

The correlation matrix shows how sensors and compliance values move together.

Correlation ranges from:

```text
+1 = move together
 0 = no clear relationship
-1 = move in opposite directions
```

### How To Interpret It

Important relationships include:

```text
UV254 tends to move with COD/BOD
turbidity tends to move with TSS
dissolved oxygen often moves opposite to organic load
```

### Why It Matters

This supports the soft-sensor approach. It shows that real-time proxy sensors contain information about harder-to-measure compliance values.

### Presentation Line

> The correlation structure supports using fast online sensors as proxies for slower lab-based indicators.

## 14. Lagged Correlations Between Proxy Sensors and Compliance Values

### What The Chart Shows

This chart checks whether proxy sensors move with compliance values at the same time or with a time lag.

Relationships shown:

```text
UV254 -> COD
turbidity -> TSS
dissolved oxygen -> BOD
```

The x-axis is the lag applied to the proxy sensor.

The y-axis is correlation.

### How To Interpret It

Strong positive lines mean the proxy and target rise together.

Strong negative lines mean one rises while the other falls.

In our data:

```text
UV254 and COD are strongly positively correlated.
turbidity and TSS are strongly positively correlated.
dissolved oxygen and BOD are negatively correlated.
```

This makes physical sense:

```text
more organic load -> higher UV254/COD
more suspended solids -> higher turbidity/TSS
more biodegradable load -> lower dissolved oxygen and higher BOD
```

### Why It Matters

This chart supports using real-time proxy sensors to estimate compliance values and predict early risk.

### Presentation Line

> The proxy sensors behave in physically sensible ways, which supports the soft-sensor and early-warning model design.

## 15. Rolling Sensor Volatility

### What The Chart Shows

This chart shows rolling 60-minute standard deviation for selected sensors.

In plain language, it measures:

> How unstable has this sensor been in the last hour?

### How To Interpret It

High volatility means the sensor is changing rapidly or behaving irregularly.

This can happen during:

- process instability
- incident onset
- sensor noise
- calibration problems

### Why It Matters

High volatility can be an early warning even before a consent limit is crossed.

### Presentation Line

> The system can use not just absolute values, but also instability and rate of change as early-warning signals.

## 16. Daily Production Cycle Profiles

### What The Chart Shows

These charts show median sensor values by hour of day.

### How To Interpret Them

If a sensor rises during production hours and falls overnight, it has a daily operating cycle.

This is expected in industrial wastewater.

### Why It Matters

The model should learn normal daily behaviour so it does not confuse routine production cycles with incidents.

### Presentation Line

> The site has normal daily operating patterns, so the model must distinguish expected production cycles from abnormal risk.

## 17. Fourier Power Spectrum

### What The Chart Shows

Fourier analysis identifies repeating cycles in the sensor data.

The x-axis is period in hours.

The y-axis is power, or how strong that repeating cycle is.

The red dashed line marks a 24-hour cycle.

### How To Interpret It

Strong peaks near 24 hours mean the sensor has a daily rhythm.

In our data, flow, temperature, turbidity, and UV254 all show strong daily cycles.

Smaller peaks at shorter periods can represent:

- shifts
- batch processes
- cleaning cycles
- process pulses

### Why It Matters

Fourier analysis confirms that production-cycle features may be useful for modelling.

It also helps avoid false alarms from normal daily variation.

### Presentation Line

> Fourier analysis confirms a strong 24-hour production cycle, which the model should account for when separating normal operation from incidents.

## 18. Short-Term Autocorrelation

### What The Chart Shows

Autocorrelation compares each sensor to its own past values.

The x-axis is lag in minutes.

The y-axis is how similar the current value is to the past value.

### How To Interpret It

High autocorrelation at short lags means recent history is informative.

For example:

```text
if turbidity is high now, it was probably also high 5 or 10 minutes ago
```

The lines gradually fall as the lag gets longer.

### Why It Matters

This supports lag and rolling-window features:

```text
lag_5min
rolling_30min_mean
```

### Presentation Line

> The sensors have short-term memory, so recent readings are useful for predicting near-term risk.

## 19. Breach Lead-Time Windows

### What The Chart Shows

This chart summarizes the 60 minutes before breach onset.

The x-axis shows minutes before breach:

```text
60 = one hour before breach
0 = breach starts now
```

The y-axis shows the median value of each parameter before breaches.

### How To Interpret It

The chart shows whether values tend to rise, fall, or become unstable before a breach.

Important point:

This is the median across all breach types. Because different incidents have different fingerprints, the lines may not be perfectly smooth.

For example:

```text
COD/BOD may rise before organic overload.
TSS may rise before solids washout.
pH may drop before acid spill.
temperature may rise before thermal discharge.
```

### Why It Matters

The hour before a breach contains useful warning signals. That supports the 15, 30, and 60-minute prediction horizons.

### Presentation Line

> Breaches often have measurable pre-warning behaviour, which is why AquaSense predicts risk before consent limits are crossed.

## 20. Data Leakage Checks

### What The Table Shows

This table lists columns that should not be used as model input features.

Examples:

```text
breach_next_15min
breach_next_30min
breach_next_60min
breach_now
compliance_status
recommended_action
```

### How To Interpret It

These columns either are labels or are derived from labels.

Using them as features would leak the answer into the model.

### Why It Matters

Avoiding leakage is essential for trustworthy model performance.

### Presentation Line

> The modelling pipeline explicitly separates predictive inputs from target labels to avoid data leakage.

## 21. Forensic Findings Summary

### What The Table Shows

This final table summarizes the key EDA findings.

It is useful for reports because it converts many charts into a short technical narrative.

### Main Takeaways

```text
The data has a stable 5-minute cadence.
Missingness is limited and identifiable.
Breaches are rare.
Soft-sensor estimates track lab values well.
There are strong daily production cycles.
Lag and rolling features are justified.
```

### Presentation Line

> The forensic EDA confirms that the data is suitable for time-series breach prediction, but the task must be treated as rare-event early warning with strong attention to sensor quality and operational context.

## Final Pitch Summary

The EDA supports the AquaSense AI product story:

```text
1. Direct sensor data is clean enough for real-time monitoring.
2. COD/BOD/TSS are estimated from proxy sensors and validated against lab data.
3. Incidents create distinct physical fingerprints.
4. Compliance breaches are rare but detectable.
5. Daily production cycles are real and must be accounted for.
6. Recent sensor history contains predictive signal.
7. The system should predict risk, explain the driver, and recommend action.
```

Strong closing line:

> AquaSense AI turns raw wastewater telemetry into explainable early-warning intelligence by combining sensor forensics, lab-calibrated soft sensors, deterministic compliance rules, and time-series breach prediction.
