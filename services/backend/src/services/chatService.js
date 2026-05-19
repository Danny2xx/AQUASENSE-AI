import { InferenceClient } from '@huggingface/inference';
import { getDb } from '../db.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

export const hf = new InferenceClient(process.env.HF_TOKEN);

export const CHAT_MODEL = process.env.HF_CHAT_MODEL || 'Qwen/Qwen2.5-7B-Instruct';

const LIMITS_PATH = path.resolve(
  fileURLToPath(import.meta.url),
  '../../../../../../packages/shared/config/demo_limits.json'
);

const SYSTEM_BASE = `You are AquaSense AI Assistant — an expert wastewater compliance agent embedded in a real-time monitoring platform for a food processing facility.

DOMAIN KNOWLEDGE
----------------
Parameters:
• COD (Chemical Oxygen Demand): Total organic load. High values indicate heavy pollution.
• BOD (Biochemical Oxygen Demand): Biodegradable organic content. Correlates with microbial activity.
• TSS (Total Suspended Solids): Particulate matter. Harms aquatic life and clogs receiving waterways.
• Ammonia-N: Toxic to aquatic organisms even at low concentrations. Often from protein breakdown.
• pH: Safe discharge range 6–10. Extremes indicate chemical imbalance or process upset.
• Temperature: Affects biological treatment efficiency and dissolved oxygen solubility.
• Turbidity: Water clarity indicator. High turbidity correlates with TSS spikes.
• Dissolved Oxygen (DO): Must stay >4 mg/L in receiving water for aquatic life.
• Conductivity: Ion concentration indicator. Sudden spikes suggest chemical discharge.
• ORP (Oxidation-Reduction Potential): Indicates oxidising vs reducing conditions in treatment.

Status levels:
• GREEN  – All parameters within limits. Low breach risk. Normal operation.
• WATCH  – Sensor anomaly detected (spike, flatline, out-of-range). Elevated monitoring.
• AMBER  – Predicted breach within 30 min OR parameter within 15% of limit. Prepare corrective action.
• RED    – Active compliance breach. Regulatory violation. Immediate intervention required.

Corrective actions:
• High COD/BOD: Reduce organic load at source, check aeration, increase retention time.
• High TSS: Check clarifier performance, adjust coagulant/flocculant dosing.
• High Ammonia: Inspect nitrification stage, check aeration, reduce protein waste input.
• pH out of range: Check chemical dosing pumps, neutralisation tank, upstream process chemicals.
• Temperature spike: Check heat exchangers, verify cooling water supply.

Be concise, professional, and actionable. Prioritise operator safety and regulatory compliance.`;

export function buildSystemPrompt(facilityId = 'demo-food-processing-plant') {
  const db = getDb();

  const latest = db.prepare(
    'SELECT * FROM predictions WHERE facility_id = ? ORDER BY created_at DESC LIMIT 1'
  ).get(facilityId);

  const statusDist = db.prepare(
    'SELECT status, COUNT(*) as cnt FROM predictions WHERE facility_id = ? GROUP BY status'
  ).all(facilityId);

  const activeAlerts = db.prepare(
    "SELECT severity, parameter, message, recommended_action, timestamp FROM alerts WHERE facility_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 5"
  ).all(facilityId);

  let limits = {};
  try { limits = JSON.parse(fs.readFileSync(LIMITS_PATH, 'utf8')); } catch {}
  const lim = limits.limits || {};

  const distStr = statusDist.map(r => `${r.status}: ${r.cnt}`).join(' | ');
  const alertStr = activeAlerts.length
    ? activeAlerts.map(a => `  [${a.severity.toUpperCase()}] ${a.parameter}: ${a.message}`).join('\n')
    : '  None';

  const liveBlock = latest ? `

LIVE SYSTEM STATE (${latest.timestamp})
----------------------------------------
Status:              ${latest.status}
Breach prob (30min): ${((latest.breach_probability_30min || 0) * 100).toFixed(1)}%
COD forecast:        ${latest.cod_forecast?.toFixed(0) ?? 'N/A'} mg/L  (limit: ${lim.cod_max_mg_l ?? '—'})
BOD forecast:        ${latest.bod_forecast?.toFixed(0) ?? 'N/A'} mg/L  (limit: ${lim.bod_max_mg_l ?? '—'})
TSS forecast:        ${latest.tss_forecast?.toFixed(0) ?? 'N/A'} mg/L  (limit: ${lim.tss_max_mg_l ?? '—'})
Ammonia forecast:    ${latest.ammonia_forecast?.toFixed(1) ?? 'N/A'} mg/L  (limit: ${lim.ammonia_max_mg_l ?? '—'})
pH forecast:         ${latest.ph_forecast?.toFixed(2) ?? 'N/A'}        (range: ${lim.ph_min ?? 6}–${lim.ph_max ?? 10})
Anomaly detected:    ${latest.anomaly_flag ? 'YES — ' + latest.anomaly_reason : 'None'}
Alert reason:        ${latest.alert_reason || 'None'}

Status history:  ${distStr}

Active alerts:
${alertStr}` : '\n[No prediction data available yet — system initialising]';

  return SYSTEM_BASE + liveBlock;
}

function fmtPct(value) {
  return `${(((value ?? 0) * 100)).toFixed(1)}%`;
}

function fmtForecast(value, decimals = 0, unit = 'mg/L') {
  if (value == null) return 'N/A';
  return `${Number(value).toFixed(decimals)}${unit ? ` ${unit}` : ''}`;
}

function statusAdvice(status) {
  switch (status) {
    case 'GREEN':
      return 'Current readings are within expected compliance limits. Continue routine monitoring.';
    case 'WATCH':
      return 'A sensor anomaly or unusual pattern has been detected. Verify sensor health and monitor the affected stream closely.';
    case 'AMBER':
      return 'There is elevated breach risk or a parameter is approaching its limit. Prepare corrective action and check the likely driver.';
    case 'RED':
      return 'There is an active compliance breach. Operators should intervene immediately and document the response.';
    default:
      return 'The system is still initialising or waiting for a fresh prediction.';
  }
}

export function buildLocalChatResponse(message, facilityId = 'demo-food-processing-plant') {
  const db = getDb();
  const text = message.toLowerCase();

  const latest = db.prepare(
    'SELECT * FROM predictions WHERE facility_id = ? ORDER BY created_at DESC LIMIT 1'
  ).get(facilityId);

  const activeAlerts = db.prepare(
    "SELECT severity, parameter, message, recommended_action, timestamp FROM alerts WHERE facility_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 5"
  ).all(facilityId);

  if (!latest) {
    return [
      'I do not have live prediction data yet.',
      '',
      'Start the ML service and backend sensor replay, then ask again once the first prediction has been generated.',
    ].join('\n');
  }

  const status = latest.status || 'UNKNOWN';
  const alertCount = activeAlerts.length;
  const alertSummary = alertCount
    ? activeAlerts.map(a => `- **${a.severity.toUpperCase()}** ${a.parameter || 'multiple'}: ${a.message}${a.recommended_action ? ` Action: ${a.recommended_action}` : ''}`).join('\n')
    : '- No active alerts.';

  if (text.includes('alert')) {
    return [
      `There ${alertCount === 1 ? 'is' : 'are'} **${alertCount} active alert${alertCount === 1 ? '' : 's'}** for the demo facility.`,
      '',
      alertSummary,
      '',
      `Current status: **${status}**. ${statusAdvice(status)}`,
    ].join('\n');
  }

  if (text.includes('cod')) {
    return [
      `Current COD forecast is **${fmtForecast(latest.cod_forecast)}**.`,
      '',
      `Overall status is **${status}** with a 30-minute breach probability of **${fmtPct(latest.breach_probability_30min)}**.`,
      '',
      'If COD is elevated, check organic load at source, aeration, and retention time.',
    ].join('\n');
  }

  if (text.includes('amber') || text.includes('watch') || text.includes('red') || text.includes('green')) {
    return [
      `The current compliance status is **${status}**.`,
      '',
      statusAdvice(status),
      '',
      `Breach probability over the next 30 minutes: **${fmtPct(latest.breach_probability_30min)}**.`,
      latest.alert_reason ? `Reason: ${latest.alert_reason}` : 'No alert reason is currently recorded.',
    ].join('\n');
  }

  if (text.includes('sensor') || text.includes('reading') || text.includes('forecast')) {
    return [
      `Latest forecast snapshot for **${facilityId}** at ${latest.timestamp}:`,
      '',
      `- Status: **${status}**`,
      `- Breach probability: **${fmtPct(latest.breach_probability_30min)}**`,
      `- COD: **${fmtForecast(latest.cod_forecast)}**`,
      `- BOD: **${fmtForecast(latest.bod_forecast)}**`,
      `- TSS: **${fmtForecast(latest.tss_forecast)}**`,
      `- Ammonia: **${fmtForecast(latest.ammonia_forecast, 1)}**`,
      `- pH: **${fmtForecast(latest.ph_forecast, 2, '')}**`,
      `- Anomaly: **${latest.anomaly_flag ? 'Yes' : 'No'}**${latest.anomaly_reason ? ` — ${latest.anomaly_reason}` : ''}`,
    ].join('\n');
  }

  return [
    `Current compliance status is **${status}**.`,
    '',
    `30-minute breach probability: **${fmtPct(latest.breach_probability_30min)}**.`,
    latest.alert_reason ? `Reason: ${latest.alert_reason}` : statusAdvice(status),
    '',
    `Active alerts: **${alertCount}**.`,
    '',
    'Note: HF_TOKEN is not configured, so I am using the local AquaSense status responder instead of the hosted chat model.',
  ].join('\n');
}
