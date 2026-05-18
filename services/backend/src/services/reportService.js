import { getDb } from '../db.js';
import { getAlerts, getRecentPredictions } from './alertService.js';

export function generateReport(facilityId) {
  const db = getDb();
  const predictions = getRecentPredictions(facilityId, 200);
  const alerts = getAlerts(facilityId, 50);

  if (predictions.length === 0) {
    return null;
  }

  const timestamps = predictions.map(p => p.timestamp).sort();
  const startTime = timestamps[0];
  const endTime = timestamps[timestamps.length - 1];

  // Status breakdown
  const statusCounts = { GREEN: 0, WATCH: 0, AMBER: 0, RED: 0 };
  let totalBreachProb = 0;
  let maxBreachProb = 0;

  for (const p of predictions) {
    statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1;
    totalBreachProb += p.breach_probability_30min ?? 0;
    maxBreachProb = Math.max(maxBreachProb, p.breach_probability_30min ?? 0);
  }

  const avgBreachProb = totalBreachProb / predictions.length;
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');

  // Build summary text
  const summary = buildReportText({
    facilityId, startTime, endTime, statusCounts, predictions,
    alerts, criticalAlerts, warningAlerts, avgBreachProb, maxBreachProb
  });

  const incidents = alerts.map(a => ({
    timestamp: a.timestamp,
    severity: a.severity,
    parameter: a.parameter,
    message: a.message,
    action: a.recommended_action,
  }));

  const report = db.prepare(`
    INSERT INTO reports (facility_id, start_time, end_time, summary, incidents_json, status_breakdown)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    facilityId, startTime, endTime, summary,
    JSON.stringify(incidents),
    JSON.stringify(statusCounts),
  );

  return {
    id: report.lastInsertRowid,
    facility_id: facilityId,
    start_time: startTime,
    end_time: endTime,
    summary,
    incidents,
    status_breakdown: statusCounts,
    generated_at: new Date().toISOString(),
  };
}

function buildReportText({ facilityId, startTime, endTime, statusCounts, predictions,
    alerts, criticalAlerts, warningAlerts, avgBreachProb, maxBreachProb }) {

  const latestPred = predictions[0];
  const forecasts = latestPred ? {
    cod: latestPred.cod_forecast?.toFixed(0),
    tss: latestPred.tss_forecast?.toFixed(0),
    ph: latestPred.ph_forecast?.toFixed(2),
    ammonia: latestPred.ammonia_forecast?.toFixed(1),
  } : {};

  const lines = [
    `AquaSense AI – Compliance Incident Report`,
    `==========================================`,
    ``,
    `Facility: ${facilityId}`,
    `Period: ${startTime} to ${endTime}`,
    `Generated: ${new Date().toISOString()}`,
    ``,
    `COMPLIANCE STATUS SUMMARY`,
    `-------------------------`,
    `Total readings analysed: ${predictions.length}`,
    `  GREEN  (compliant):        ${statusCounts.GREEN ?? 0}`,
    `  WATCH  (risk rising):      ${statusCounts.WATCH ?? 0}`,
    `  AMBER  (warning/predicted): ${statusCounts.AMBER ?? 0}`,
    `  RED    (breach):           ${statusCounts.RED ?? 0}`,
    ``,
    `PREDICTIVE RISK`,
    `---------------`,
    `Average 30-min breach probability: ${(avgBreachProb * 100).toFixed(1)}%`,
    `Peak 30-min breach probability:    ${(maxBreachProb * 100).toFixed(1)}%`,
    ``,
    `CURRENT FORECASTS (+30 min)`,
    `---------------------------`,
    forecasts.cod    ? `  COD forecast:     ${forecasts.cod} mg/L  (limit: 1500 mg/L)` : '',
    forecasts.tss    ? `  TSS forecast:     ${forecasts.tss} mg/L  (limit: 800 mg/L)` : '',
    forecasts.ammonia ? `  Ammonia forecast: ${forecasts.ammonia} mg/L  (limit: 180 mg/L)` : '',
    forecasts.ph     ? `  pH forecast:      ${forecasts.ph}       (range: 6.0–10.0)` : '',
    ``,
    `ALERTS`,
    `------`,
    `Critical alerts: ${criticalAlerts.length}`,
    `Warning alerts:  ${warningAlerts.length}`,
    `Total alerts:    ${alerts.length}`,
    ``,
  ];

  if (alerts.length > 0) {
    lines.push(`INCIDENT LOG`);
    lines.push(`------------`);
    for (const a of alerts.slice(0, 10)) {
      lines.push(`[${a.severity.toUpperCase()}] ${a.timestamp} | ${a.parameter}: ${a.message}`);
      if (a.recommended_action) lines.push(`  Action: ${a.recommended_action}`);
    }
    lines.push('');
  }

  lines.push(`DATA QUALITY`);
  lines.push(`------------`);
  lines.push(`Sensor stream: continuous CSV replay (simulated IoT data)`);
  lines.push(`Model: AquaSense AI v1.0 – hist_gradient_boosting breach classifier`);
  lines.push(`Note: This report is generated from simulated prototype data.`);
  lines.push(`Production deployment requires real facility sensor data and consent limits.`);

  return lines.filter(l => l !== null).join('\n');
}

export function getReports(facilityId, limit = 10) {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM reports WHERE facility_id = ? ORDER BY generated_at DESC LIMIT ?'
  ).all(facilityId, limit);
}

export function getReport(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
}
