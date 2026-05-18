'use client';

interface SensorCardProps {
  label: string;
  value?: number | null;
  unit: string;
  limit?: number;
  limitLabel?: string;
  forecast?: number | null;
  decimals?: number;
}

export function SensorCard({ label, value, unit, limit, limitLabel, forecast, decimals = 0 }: SensorCardProps) {
  const fmt = (v?: number | null) =>
    v == null ? '—' : v.toFixed(decimals);

  let statusColor = 'text-slate-200';
  let barColor = 'bg-blue-500';
  let pct = 0;

  if (value != null && limit != null) {
    pct = Math.min((value / limit) * 100, 100);
    if (pct >= 100) { statusColor = 'text-red-400'; barColor = 'bg-red-500'; }
    else if (pct >= 85) { statusColor = 'text-yellow-400'; barColor = 'bg-yellow-500'; }
    else { statusColor = 'text-green-400'; barColor = 'bg-green-500'; }
  }

  return (
    <div className="card">
      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-2xl font-bold ${statusColor}`}>
        {fmt(value)} <span className="text-sm font-normal text-slate-400">{unit}</span>
      </div>
      {limit != null && (
        <>
          <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>0</span>
            <span>{limitLabel ?? `Limit: ${limit} ${unit}`}</span>
          </div>
        </>
      )}
      {forecast != null && (
        <div className="mt-2 text-xs text-slate-400">
          +30 min: <span className="text-blue-300 font-semibold">{fmt(forecast)} {unit}</span>
        </div>
      )}
    </div>
  );
}
