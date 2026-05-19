'use client';
import { useLiveData } from '../../lib/useLiveData';
import { Navigation } from '../../components/Navigation';

const SENSORS = [
  { key: 'ph', label: 'pH', unit: '', range: [0, 14] },
  { key: 'cod_mg_l', label: 'COD', unit: 'mg/L', range: [0, 5000] },
  { key: 'tss_mg_l', label: 'TSS', unit: 'mg/L', range: [0, 2000] },
  { key: 'bod_mg_l', label: 'BOD', unit: 'mg/L', range: [0, 2000] },
  { key: 'ammonia_mg_l', label: 'Ammonia', unit: 'mg/L', range: [0, 500] },
  { key: 'temperature_c', label: 'Temperature', unit: '°C', range: [0, 80] },
  { key: 'turbidity_ntu', label: 'Turbidity', unit: 'NTU', range: [0, 1000] },
  { key: 'dissolved_oxygen_mg_l', label: 'Dissolved O₂', unit: 'mg/L', range: [0, 20] },
  { key: 'flow_rate_lps', label: 'Flow Rate', unit: 'L/s', range: [0, 500] },
  { key: 'conductivity_us_cm', label: 'Conductivity', unit: 'µS/cm', range: [0, 5000] },
];

function fmtTs(ts: string) {
  try { return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  catch { return ts; }
}

export default function DataQualityPage() {
  const { reading, prediction, history, connected } = useLiveData();

  const sensorStatus = reading?.sensor_status ?? 'unknown';
  const eventType = reading?.event_type ?? 'unknown';

  // Compute data quality stats from history
  const totalReadings = history.length;
  const anomalies = history.filter(h => h.anomaly_flag).length;
  const ambers = history.filter(h => h.status === 'AMBER').length;
  const reds = history.filter(h => h.status === 'RED').length;

  return (
    <>
      <Navigation connected={connected} />
      <main className="mt-10 pt-14 max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-100 mb-1">Data Quality</h1>
          <p className="text-slate-400 text-sm">Sensor health, stream integrity, and anomaly detection status</p>
        </div>

        {/* Stream status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="card">
            <div className="text-xs text-slate-500 uppercase mb-1">Stream Status</div>
            <div className={`text-lg font-bold ${connected ? 'text-green-400' : 'text-red-400'}`}>
              {connected ? 'LIVE' : 'OFFLINE'}
            </div>
          </div>
          <div className="card">
            <div className="text-xs text-slate-500 uppercase mb-1">Sensor Status</div>
            <div className={`text-lg font-bold ${sensorStatus === 'ok' ? 'text-green-400' : 'text-yellow-400'}`}>
              {sensorStatus.toUpperCase()}
            </div>
          </div>
          <div className="card">
            <div className="text-xs text-slate-500 uppercase mb-1">Event Type</div>
            <div className="text-lg font-bold text-slate-200">{eventType}</div>
          </div>
          <div className="card">
            <div className="text-xs text-slate-500 uppercase mb-1">Last Reading</div>
            <div className="text-sm font-bold text-slate-200">
              {reading?.timestamp ? fmtTs(reading.timestamp) : '—'}
            </div>
          </div>
        </div>

        {/* Anomaly detection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="card">
            <div className="text-xs text-slate-500 uppercase mb-3">Anomaly Detection Status</div>
            <div className={`flex items-center gap-3 ${prediction?.anomaly_flag ? 'text-yellow-400' : 'text-green-400'}`}>
              <span className="text-2xl">{prediction?.anomaly_flag ? '⚠️' : '✓'}</span>
              <div>
                <div className="font-bold">{prediction?.anomaly_flag ? 'ANOMALY DETECTED' : 'NO ANOMALY'}</div>
                <div className="text-sm text-slate-400 mt-0.5">
                  {prediction?.anomaly_reason ?? 'All sensors within normal operating range'}
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="text-xs text-slate-500 uppercase mb-3">History Summary (this session)</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-slate-500">Readings:</span> <span className="text-slate-200 font-bold">{totalReadings}</span></div>
              <div><span className="text-slate-500">Anomalies:</span> <span className="text-yellow-400 font-bold">{anomalies}</span></div>
              <div><span className="text-slate-500">Amber:</span> <span className="text-yellow-400 font-bold">{ambers}</span></div>
              <div><span className="text-slate-500">Red:</span> <span className="text-red-400 font-bold">{reds}</span></div>
            </div>
          </div>
        </div>

        {/* Sensor health table */}
        <div className="card">
          <div className="text-xs text-slate-500 uppercase mb-4">Sensor Health Monitor</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase">
                  <th className="text-left pb-2">Sensor</th>
                  <th className="text-right pb-2">Current Value</th>
                  <th className="text-right pb-2">Physical Range</th>
                  <th className="text-right pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {SENSORS.map(({ key, label, unit, range }) => {
                  const val = reading ? (reading as any)[key] : null;
                  const valid = val != null && val >= range[0] && val <= range[1];
                  const missing = val == null;
                  const status = missing ? 'MISSING' : valid ? 'OK' : 'INVALID';
                  return (
                    <tr key={key} className="hover:bg-slate-800/30">
                      <td className="py-2 text-slate-300">{label}</td>
                      <td className="py-2 text-right font-mono">
                        {val == null ? <span className="text-slate-600">—</span> : `${val.toFixed(2)} ${unit}`}
                      </td>
                      <td className="py-2 text-right text-slate-500">{range[0]}–{range[1]} {unit}</td>
                      <td className="py-2 text-right">
                        <span className={`font-bold ${status === 'OK' ? 'text-green-400' : status === 'MISSING' ? 'text-slate-500' : 'text-red-400'}`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Model info */}
        <div className="card mt-4">
          <div className="text-xs text-slate-500 uppercase mb-3">Model & Inference</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-slate-500 text-xs">Artifact</div>
              <div className="text-slate-200">{prediction?.model_version ?? '—'}</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs">Sufficient History</div>
              <div className={prediction?.sufficient_history ? 'text-green-400' : 'text-yellow-400'}>
                {prediction?.sufficient_history == null ? '—' : prediction.sufficient_history ? 'YES' : 'WARMING UP'}
              </div>
            </div>
            <div>
              <div className="text-slate-500 text-xs">Classifier</div>
              <div className="text-slate-200">HistGradientBoosting</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs">Anomaly Model</div>
              <div className="text-slate-200">Rule Sensor Quality</div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
