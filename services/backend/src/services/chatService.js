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
