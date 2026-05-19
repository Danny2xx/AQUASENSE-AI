'use client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';

interface DataPoint {
  time: string;
  value: number;
  forecast?: number;
}

interface LiveChartProps {
  data: DataPoint[];
  limit?: number;
  label: string;
  color?: string;
  forecastColor?: string;
  unit?: string;
  height?: number;
}

const CustomTooltip = ({ active, payload, label, unit }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded p-2 text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value?.toFixed(1)} {unit}
        </p>
      ))}
    </div>
  );
};

export function LiveChart({ data, limit, label, color = '#3b82f6', forecastColor = '#f59e0b', unit = '', height = 160 }: LiveChartProps) {
  const vals = data.map(d => d.value).filter(Boolean);
  const minVal = Math.min(...vals, limit ?? Infinity) * 0.85;
  const maxVal = Math.max(...vals, limit ?? 0) * 1.1;

  return (
    <div>
      <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">{label}</div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis tick={{ fill: '#64748b', fontSize: 10 }} domain={[minVal, maxVal]} />
          <Tooltip content={<CustomTooltip unit={unit} />} />
          {limit != null && (
            <ReferenceLine y={limit} stroke="#ef4444" strokeDasharray="4 4"
              label={{ value: 'Limit', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }} />
          )}
          <Line type="monotone" dataKey="value" name="Current" stroke={color}
            dot={false} strokeWidth={2} isAnimationActive={false} />
          {data.some(d => d.forecast != null) && (
            <Line type="monotone" dataKey="forecast" name="Forecast +30min"
              stroke={forecastColor} dot={false} strokeWidth={2}
              strokeDasharray="4 2" isAnimationActive={false} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
