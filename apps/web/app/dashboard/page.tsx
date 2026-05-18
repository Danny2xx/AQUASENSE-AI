'use client';
import { useLiveData } from '../../lib/useLiveData';
import { Navigation } from '../../components/Navigation';
import { StatusBadge } from '../../components/StatusBadge';
import { SensorCard } from '../../components/SensorCard';
import { LiveChart } from '../../components/LiveChart';
import { useEffect, useState } from 'react';

interface ChartPoint {
  time: string;
  value: number;
  forecast?: number;
}

function fmtTime(ts: string) {
  try { return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  catch { return ts; }
}

export default function DashboardPage() {
  const { prediction, reading, connected } = useLiveData();
  const [codHistory, setCodHistory] = useState<ChartPoint[]>([]);
  const [phHistory, setPhHistory] = useState<ChartPoint[]>([]);
  const [tssHistory, setTssHistory] = useState<ChartPoint[]>([]);
  const [ammHistory, setAmmHistory] = useState<ChartPoint[]>([]);

  useEffect(() => {
    if (!reading || !prediction) return;
    const time = fmtTime(reading.timestamp || '');
    if (reading.cod_mg_l != null) {
      setCodHistory(h => [...h.slice(-60), { time, value: reading.cod_mg_l!, forecast: prediction.forecasts_30min?.cod_mg_l }]);
    }
    if (reading.ph != null) {
      setPhHistory(h => [...h.slice(-60), { time, value: reading.ph!, forecast: prediction.forecasts_30min?.ph }]);
    }
    if (reading.tss_mg_l != null) {
      setTssHistory(h => [...h.slice(-60), { time, value: reading.tss_mg_l!, forecast: prediction.forecasts_30min?.tss_mg_l }]);
    }
    if (reading.ammonia_mg_l != null) {
      setAmmHistory(h => [...h.slice(-60), { time, value: reading.ammonia_mg_l!, forecast: prediction.forecasts_30min?.ammonia_mg_l }]);
    }
  }, [reading, prediction]);

  const status = prediction?.status ?? 'INITIALIZING';
  const comp = prediction?.compliance;

  const statusBg: Record<string, string> = {
    GREEN: 'border-green-500/30 bg-green-950/20',
    WATCH: 'border-blue-500/30 bg-blue-950/20',
    AMBER: 'border-yellow-500/30 bg-yellow-950/20',
    RED: 'border-red-500/30 bg-red-950/20',
    INITIALIZING: 'border-slate-700',
  };

  return (
    <>
      <Navigation connected={connected} />
      <main className="pt-14 max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className={`card mb-6 border-2 ${statusBg[status] ?? statusBg.INITIALIZING}`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Demo Food Processing Plant</div>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold">{status}</span>
                <StatusBadge status={status} className="text-sm px-3 py-1" />
              </div>
              {prediction?.alert_reason && (
                <p className="text-sm text-slate-400 mt-1 max-w-xl">{prediction.alert_reason}</p>
              )}
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">Last updated</div>
              <div className="text-sm text-slate-300">{prediction?.timestamp ? fmtTime(prediction.timestamp) : '—'}</div>
              <div className="text-xs text-slate-500 mt-1">{prediction?.model_version ?? '—'}</div>
            </div>
          </div>
        </div>

        {/* Sensor KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <SensorCard label="pH" value={reading?.ph} unit="" limit={10} limitMin={6}
            limitLabel="6.0–10.0" forecast={prediction?.forecasts_30min?.ph} decimals={2} />
          <SensorCard label="COD" value={reading?.cod_mg_l} unit="mg/L" limit={1500}
            forecast={prediction?.forecasts_30min?.cod_mg_l} />
          <SensorCard label="TSS" value={reading?.tss_mg_l} unit="mg/L" limit={800}
            forecast={prediction?.forecasts_30min?.tss_mg_l} />
          <SensorCard label="BOD" value={reading?.bod_mg_l} unit="mg/L" limit={900}
            forecast={prediction?.forecasts_30min?.bod_mg_l} />
          <SensorCard label="Ammonia" value={reading?.ammonia_mg_l} unit="mg/L" limit={180}
            forecast={prediction?.forecasts_30min?.ammonia_mg_l} decimals={1} />
          <SensorCard label="Temperature" value={reading?.temperature_c} unit="°C" limit={43}
            decimals={1} />
        </div>

        {/* Compliance detail */}
        {comp && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <div className="card">
              <div className="text-xs text-slate-500 uppercase mb-2">Breached Parameters</div>
              {comp.breached_parameters.length === 0
                ? <div className="text-green-400 text-sm">None</div>
                : comp.breached_parameters.map(p => (
                  <div key={p} className="text-red-400 font-bold text-sm">{p}</div>
                ))
              }
            </div>
            <div className="card">
              <div className="text-xs text-slate-500 uppercase mb-2">Warning Parameters</div>
              {comp.warning_parameters.length === 0
                ? <div className="text-green-400 text-sm">None</div>
                : comp.warning_parameters.map(p => (
                  <div key={p} className="text-yellow-400 font-bold text-sm">{p}</div>
                ))
              }
            </div>
            <div className="card">
              <div className="text-xs text-slate-500 uppercase mb-2">Recommended Action</div>
              <p className="text-sm text-slate-300">{prediction?.recommended_action ?? '—'}</p>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="card">
            <LiveChart data={codHistory} limit={1500} label="COD (mg/L) + Forecast" color="#3b82f6" unit="mg/L" />
          </div>
          <div className="card">
            <LiveChart data={phHistory} limit={10} label="pH + Forecast" color="#8b5cf6" unit="" height={160} />
          </div>
          <div className="card">
            <LiveChart data={tssHistory} limit={800} label="TSS (mg/L) + Forecast" color="#06b6d4" unit="mg/L" />
          </div>
          <div className="card">
            <LiveChart data={ammHistory} limit={180} label="Ammonia (mg/L) + Forecast" color="#f97316" unit="mg/L" />
          </div>
        </div>

        {/* Sensor readings table */}
        <div className="card">
          <div className="text-xs text-slate-500 uppercase mb-3">Current Sensor Readings</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-sm">
            {[
              ['Flow Rate', reading?.flow_rate_lps, 'L/s', 1],
              ['Turbidity', reading?.turbidity_ntu, 'NTU', 1],
              ['Conductivity', reading?.conductivity_us_cm, 'µS/cm', 0],
              ['Dissolved O₂', reading?.dissolved_oxygen_mg_l, 'mg/L', 2],
            ].map(([label, val, unit, dec]) => (
              <div key={label as string} className="bg-slate-800/50 rounded p-2">
                <div className="text-slate-500 text-xs">{label}</div>
                <div className="text-slate-200 font-mono">
                  {val == null ? '—' : (val as number).toFixed(dec as number)} {unit}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
