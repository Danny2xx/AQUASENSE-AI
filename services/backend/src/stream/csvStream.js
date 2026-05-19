import { createReadStream } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { parse } from 'csv-parse';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = join(__dirname, '..', '..', '..', '..', 'data', 'processed', 'operational_compliance_dataset.csv');

// Compliance columns take priority over the raw online-sensor readings.
// Map these explicitly; raw `ammonia_mg_l` is skipped in SENSOR_COLS so there's no conflict.
const COL_MAP = {
  tss_mg_l_for_compliance: 'tss_mg_l',
  cod_mg_l_for_compliance: 'cod_mg_l',
  bod_mg_l_for_compliance: 'bod_mg_l',
  ammonia_mg_l_for_compliance: 'ammonia_mg_l',
};

// Note: estimated_* and lab_* columns are already excluded by the SENSOR_COLS allowlist below.

const SENSOR_COLS = [
  'timestamp', 'facility_id', 'flow_rate_lps', 'temperature_c', 'ph',
  'turbidity_ntu', 'conductivity_us_cm', 'dissolved_oxygen_mg_l', 'orp_mv',
  'ammonia_mg_l', 'uv254_abs', 'tss_mg_l', 'cod_mg_l', 'bod_mg_l',
  'sensor_status', 'event_type',
];

let allRows = null;
let currentIndex = 0;

async function loadCsv() {
  return new Promise((resolve, reject) => {
    const rows = [];
    createReadStream(CSV_PATH)
      .pipe(parse({ columns: true, cast: false, trim: true }))
      .on('data', (row) => {
        const mapped = {};
        for (const [k, v] of Object.entries(row)) {
          const key = COL_MAP[k] ?? k;
          mapped[key] = v;
        }
        // Keep only sensor columns
        const out = {};
        for (const col of SENSOR_COLS) {
          const val = mapped[col];
          if (val === undefined || val === '' || val === 'nan' || val === 'NaN') {
            out[col] = null;
          } else if (col === 'timestamp' || col === 'facility_id' || col === 'sensor_status' || col === 'event_type') {
            out[col] = val;
          } else {
            const num = parseFloat(val);
            out[col] = isNaN(num) ? null : num;
          }
        }
        rows.push(out);
      })
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

export async function initStream() {
  allRows = await loadCsv();
  console.log(`CSV loaded: ${allRows.length} rows`);
}

export function getNextReading() {
  if (!allRows || allRows.length === 0) return null;
  const row = allRows[currentIndex % allRows.length];
  currentIndex++;
  return row;
}

export function getBuffer(windowSize = 30) {
  if (!allRows || allRows.length === 0) return [];
  const end = currentIndex;
  const start = Math.max(0, end - windowSize);
  return allRows.slice(start, end);
}

export function getTotalRows() {
  return allRows ? allRows.length : 0;
}

export function resetStream() {
  currentIndex = 0;
}
