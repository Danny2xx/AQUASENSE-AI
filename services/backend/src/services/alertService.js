import { getDb } from '../db.js';

let lastAlertAt = { RED: 0, AMBER: 0, WATCH: 0 };

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

  const now = Date.now();
  const COOLDOWN = { RED: 30_000, AMBER: 60_000, WATCH: 120_000 };
  const cooled = s => (now - (lastAlertAt[s] ?? 0)) > (COOLDOWN[s] ?? 120_000);
  const hasBreaches = compliance?.breached_parameters?.length > 0;

  // Alert on any non-GREEN status with per-severity cooldown
  const shouldAlert = (
    (status === 'RED'   && cooled('RED'))   ||
    (status === 'AMBER' && cooled('AMBER')) ||
    (status === 'WATCH' && cooled('WATCH')) ||
    hasBreaches
  );

  if (shouldAlert) {
    if (lastAlertAt[status] !== undefined) lastAlertAt[status] = now;
    const severity =
      status === 'RED' ? 'critical' :
      (status === 'AMBER' || hasBreaches) ? 'warning' : 'info';
    const parameter = compliance?.breached_parameters?.[0] || compliance?.warning_parameters?.[0] || 'multiple';

    const message = `Compliance ${status}: ${alert_reason}`;
    const ins = db.prepare(`
      INSERT INTO alerts (facility_id, timestamp, severity, parameter, message,
        alert_reason, recommended_action, breach_probability, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(
      facility_id, timestamp, severity, parameter, message,
      alert_reason, recommended_action, breach_probability_30min,
    );

    return {
      id: ins.lastInsertRowid,
      facility_id, timestamp, severity, parameter, message,
      alert_reason, recommended_action,
      breach_probability: breach_probability_30min,
      status: 'active',
    };
  }

  return null;
}

export function getAlerts(facilityId, limit = 50) {
  const db = getDb();
  const alerts = db.prepare(
    'SELECT * FROM alerts WHERE facility_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(facilityId, limit);
  const { total } = db.prepare(
    'SELECT COUNT(*) as total FROM alerts WHERE facility_id = ?'
  ).get(facilityId);
  const severityRows = db.prepare(
    "SELECT severity, COUNT(*) as cnt FROM alerts WHERE facility_id = ? AND status = 'active' GROUP BY severity"
  ).all(facilityId);
  const activeCounts = Object.fromEntries(severityRows.map(r => [r.severity, r.cnt]));
  return { alerts, total, activeCounts };
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
