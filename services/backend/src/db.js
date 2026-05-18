import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'aquasense.db');

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initSchema(db);
  }
  return db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      facility_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      severity TEXT NOT NULL,
      parameter TEXT,
      message TEXT,
      alert_reason TEXT,
      recommended_action TEXT,
      breach_probability REAL,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      facility_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      status TEXT,
      breach_probability_30min REAL,
      breach_risk_label TEXT,
      cod_forecast REAL,
      tss_forecast REAL,
      bod_forecast REAL,
      ammonia_forecast REAL,
      ph_forecast REAL,
      anomaly_flag INTEGER,
      anomaly_reason TEXT,
      alert_reason TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      facility_id TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      summary TEXT,
      incidents_json TEXT,
      status_breakdown TEXT,
      generated_at TEXT DEFAULT (datetime('now'))
    );
  `);
}
