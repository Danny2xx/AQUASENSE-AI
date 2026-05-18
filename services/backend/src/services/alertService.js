import { getDb } from '../db.js';

let lastStatus = 'GREEN';

export function evaluateAndSaveAlert(prediction) {
  const db = getDb();
  const { status, compliance, breach_probability_30min, alert_reason, recommended_action,
          timestamp, facility_id, anomaly_flag, anomaly_reason } = prediction;

  // Save every prediction
  db.prepare(`
    INSERT INTO predictions (facility_id, timestamp, status, breach_probability_30min,
      breach_risk_label, cod_forecast, tss_forecast, bod_forecast, ammonia_forecast,
      ph_forecast, anomaly_flag, anomaly_reason, alert_reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    facility_id, timestamp, status, breach_probability_30min,
    prediction.breach_risk_label,
    prediction.forecasts_30min?.cod_mg_l ?? null,
    prediction.forecasts_30min?.tss_mg_l ?? null,
    prediction.forecasts_30min?.bod_mg_l ?? null,
    prediction.forecasts_30min?.ammonia_mg_l ?? null,
    prediction.forecasts_30min?.ph ?? null,
    anomaly_flag ? 1 : 0,
    anomaly_reason ?? null,
    alert_reason,
  );

  // Create alert when status worsens or is RED/AMBER
  const shouldAlert = (
    (status === 'RED' && lastStatus !== 'RED') ||
    (status === 'AMBER' && lastStatus === 'GREEN') ||
    (status === 'WATCH' && lastStatus === 'GREEN') ||
    compliance?.breached_parameters?.length > 0
  );

  if (shouldAlert) {
    const severity = status === 'RED' ? 'critical' : status === 'AMBER' ? 'warning' : 'info';
    const parameter = compliance?.breached_parameters?.[0] || compliance?.warning_parameters?.[0] || 'multiple';

    db.prepare(`
      INSERT INTO alerts (facility_id, timestamp, severity, parameter, message,
        alert_reason, recommended_action, breach_probability, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(
      facility_id, timestamp, severity, parameter,
      `Compliance ${status}: ${alert_reason}`,
      alert_reason, recommended_action, breach_probability_30min,
    );
  }

  lastStatus = status;
}

export function getAlerts(facilityId, limit = 50) {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM alerts WHERE facility_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(facilityId, limit);
}

export function getActiveAlerts(facilityId) {
  const db = getDb();
  return db.prepare(
    "SELECT * FROM alerts WHERE facility_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 20"
  ).all(facilityId);
}

export function acknowledgeAlert(id) {
  const db = getDb();
  return db.prepare("UPDATE alerts SET status = 'acknowledged' WHERE id = ?").run(id);
}

export function getRecentPredictions(facilityId, limit = 100) {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM predictions WHERE facility_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(facilityId, limit);
}
