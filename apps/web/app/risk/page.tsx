'use client';
import { useLiveData } from '../../lib/useLiveData';
import { Navigation } from '../../components/Navigation';
import { StatusBadge } from '../../components/StatusBadge';
import { LiveChart } from '../../components/LiveChart';
import { useEffect, useState } from 'react';

interface RiskPoint { time: string; value: number; }

function fmtTime(ts: string) {
  try { return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  catch { return ts; }
}

function GaugeBar({ pct, label }: { pct: number; label: string }) {
  const color = pct >= 70 ? 'bg-red-500' : pct >= 35 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>{label}</span>
        <span className="font-bold">{pct.toFixed(1)}%</span>
      </div>
      <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

export default function RiskPage() {
  const { prediction, connected } = useLiveData();
  const [riskHistory, setRiskHistory] = useState<RiskPoint[]>([]);

  useEffect(() => {
    if (!prediction) return;
    const time = fmtTime(prediction.timestamp || '');
    const prob = (prediction.breach_probability_30min ?? 0) * 100;
    setRiskHistory(h => [...h.slice(-120), { time, value: prob }]);
  }, [prediction]);

  const prob = ((prediction?.breach_probability_30min ?? 0) * 100);
  const status = prediction?.status ?? 'INITIALIZING';

  return (
    <>
      <Navigation connected={connected} />
      <main className="pt-14 max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-100 mb-1">Predictive Risk</h1>
          <p className="text-slate-400 text-sm">30-minute breach probability and model-driven early warnings</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Breach probability */}
          <div className="card col-span-1 flex flex-col gap-4">
            <div>
              <div className="text-xs text-slate-500 uppercase mb-1">Breach Probability (30 min)</div>
              <div className={`text-5xl font-bold ${prob >= 70 ? 'text-red-400' : prob >= 35 ? 'text-yellow-400' : 'text-green-400'}`}>
                {prob.toFixed(1)}%
              </div>
            </div>
            <GaugeBar pct={prob} label="Risk level" />
            <div>
              <div className="text-xs text-slate-500 uppercase mb-1">Risk Label</div>
              <StatusBadge status={prediction?.breach_risk_label ?? 'Low'} />
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase mb-1">Current Status</div>
              <StatusBadge status={status} />
            </div>
          </div>

          {/* Top drivers */}
          <div className="card col-span-1">
            <div className="text-xs text-slate-500 uppercase mb-3">Top Risk Drivers</div>
            {prediction?.top_drivers?.length ? (
              <ul className="space-y-2">
                {prediction.top_drivers.map((d, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="text-blue-400 font-bold">{i + 1}.</span>
                    <span className="text-slate-300">{d}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 text-sm">No significant drivers detected</p>
            )}
          </div>

          {/* Forecasts */}
          <div className="card col-span-1">
            <div className="text-xs text-slate-500 uppercase mb-3">30-Min Pollutant Forecasts</div>
            {prediction?.forecasts_30min ? (
              <div className="space-y-3">
                {[
                  ['COD', prediction.forecasts_30min.cod_mg_l, 1500, 'mg/L'],
                  ['TSS', prediction.forecasts_30min.tss_mg_l, 800, 'mg/L'],
                  ['BOD', prediction.forecasts_30min.bod_mg_l, 900, 'mg/L'],
                  ['Ammonia', prediction.forecasts_30min.ammonia_mg_l, 180, 'mg/L'],
                  ['pH', prediction.forecasts_30min.ph, 10, ''],
                ].map(([name, val, limit, unit]) => {
                  if (val == null) return null;
                  const v = val as number;
                  const l = limit as number;
                  const over = v > l;
                  return (
                    <div key={name as string} className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">{name}</span>
                      <span className={`font-mono font-bold ${over ? 'text-red-400' : 'text-blue-300'}`}>
                        {v.toFixed(name === 'pH' ? 2 : 0)} {unit}
                        {over && <span className="ml-1 text-red-500 text-xs">▲ LIMIT</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Waiting for predictions…</p>
            )}
          </div>
        </div>

        {/* Risk history chart */}
        <div className="card mb-4">
          <LiveChart data={riskHistory} limit={70} label="Breach Probability (%) – Live History"
            color="#ef4444" forecastColor="#f59e0b" unit="%" height={200} />
        </div>

        {/* Alert reason & action */}
        {prediction?.alert_reason && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card border border-slate-700">
              <div className="text-xs text-slate-500 uppercase mb-2">Alert Reason</div>
              <p className="text-sm text-slate-300">{prediction.alert_reason}</p>
            </div>
            <div className="card border border-blue-800">
              <div className="text-xs text-blue-400 uppercase mb-2">Recommended Action</div>
              <p className="text-sm text-blue-200">{prediction.recommended_action}</p>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
