'use client';
import { useLiveData } from '../../lib/useLiveData';
import { Navigation } from '../../components/Navigation';
import { StatusBadge } from '../../components/StatusBadge';
import { fetchAlerts, acknowledgeAlert } from '../../lib/api';
import { useEffect, useState } from 'react';

interface Alert {
  id: number;
  facility_id: string;
  timestamp: string;
  severity: string;
  parameter: string;
  message: string;
  alert_reason: string;
  recommended_action: string;
  breach_probability: number;
  status: string;
  created_at: string;
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: 'badge-red',
    warning: 'badge-amber',
    info: 'badge-watch',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase ${map[severity] ?? 'badge-gray'}`}>
      {severity}
    </span>
  );
}

function fmtTs(ts: string) {
  try { return new Date(ts).toLocaleString('en-GB'); } catch { return ts; }
}

export default function AlertsPage() {
  const { connected, prediction } = useLiveData();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [totalAlerts, setTotalAlerts] = useState(0);
  const [activeCounts, setActiveCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    const { alerts: data = [], total = 0, activeCounts: counts = {} } = await fetchAlerts('demo-food-processing-plant', 100);
    setAlerts(data);
    setTotalAlerts(total);
    setActiveCounts(counts);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  // Refresh when new predictions arrive
  useEffect(() => { if (prediction) load(); }, [prediction?.timestamp]);

  async function ack(id: number) {
    await acknowledgeAlert(id);
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'acknowledged' } : a));
  }

  const active = alerts.filter(a => a.status === 'active');
  const resolved = alerts.filter(a => a.status !== 'active');

  return (
    <>
      <Navigation connected={connected} />
      <main className="mt-10 pt-14 max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 mb-1">Alert Centre</h1>
            <p className="text-slate-400 text-sm">Compliance and anomaly alerts for Demo Food Processing Plant</p>
          </div>
          <button onClick={load} className="text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md text-slate-200 transition-colors">
            Refresh
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="card text-center">
            <div className="text-3xl font-bold text-red-400">{activeCounts['critical'] ?? 0}</div>
            <div className="text-xs text-slate-500 uppercase mt-1">Critical Active</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-yellow-400">{activeCounts['warning'] ?? 0}</div>
            <div className="text-xs text-slate-500 uppercase mt-1">Warnings Active</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-slate-300">{totalAlerts}</div>
            <div className="text-xs text-slate-500 uppercase mt-1">Total Alerts</div>
          </div>
        </div>

        {loading && <div className="text-slate-500 text-sm">Loading alerts…</div>}

        {/* Active alerts */}
        {active.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">Active Alerts</h2>
            <div className="space-y-2">
              {active.map(alert => (
                <div key={alert.id} className="card border border-red-900/50 bg-red-950/10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <SeverityBadge severity={alert.severity} />
                        <span className="text-slate-400 text-xs">{fmtTs(alert.timestamp)}</span>
                        <span className="text-slate-500 text-xs">| {alert.parameter}</span>
                      </div>
                      <p className="text-sm text-slate-200">{alert.message}</p>
                      {alert.recommended_action && (
                        <p className="text-xs text-blue-300 mt-1">Action: {alert.recommended_action}</p>
                      )}
                      {alert.breach_probability > 0 && (
                        <p className="text-xs text-slate-500 mt-1">
                          Breach probability: {(alert.breach_probability * 100).toFixed(1)}%
                        </p>
                      )}
                    </div>
                    <button onClick={() => ack(alert.id)}
                      className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-300 shrink-0 transition-colors">
                      Acknowledge
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {active.length === 0 && !loading && (
          <div className="card text-center py-8 mb-6">
            <div className="text-green-400 text-2xl mb-2">✓</div>
            <div className="text-slate-400">No active alerts</div>
          </div>
        )}

        {/* Resolved alerts */}
        {resolved.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
              Resolved / Acknowledged ({resolved.length})
            </h2>
            <div className="space-y-2">
              {resolved.slice(0, 20).map(alert => (
                <div key={alert.id} className="card opacity-60">
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={alert.severity} />
                    <span className="text-slate-500 text-xs">{fmtTs(alert.timestamp)}</span>
                    <span className="text-slate-600 text-xs">| {alert.parameter}</span>
                    <span className="text-slate-500 text-xs ml-auto">{alert.status}</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
