'use client';
import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Navigation } from '../../components/Navigation';
import { useLiveData } from '../../lib/useLiveData';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar,
} from 'recharts';
import { Droplets, Thermometer, AlertTriangle, MapPin, RefreshCw } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

const DroughtMap = dynamic(() => import('../../components/DroughtMap'), { ssr: false });

interface CityData {
  name: string;
  lat: number;
  lon: number;
  facility: boolean;
  drought: { index: number; label: string; color: string };
  groundwaterStress: number;
  precipAnomaly: number;
  totalPrecip90: number;
  totalET90: number;
  avgSoilMoisture: number;
  trend: { date: string; precipitation: number; soilMoisture: number; et: number }[];
}

interface RegionalData {
  fetchedAt: string;
  cities: CityData[];
}

function useTheme() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const update = () =>
      setIsDark(document.documentElement.getAttribute('data-theme') !== 'light');
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

function DroughtGauge({ index, label, color, isDark }: {
  index: number; label: string; color: string; isDark: boolean;
}) {
  const pct = (index / 5) * 100;
  const trackColor = isDark ? '#1e293b' : '#e2e8f0';
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke={trackColor} strokeWidth="10" />
          <circle
            cx="50" cy="50" r="40" fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={`${pct * 2.513} 251.3`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-slate-100">{index}</span>
          <span className="text-xs text-slate-400">/ 5</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-sm font-semibold" style={{ color }}>{label}</div>
        <div className="text-xs text-slate-500 mt-0.5">Drought Index (D0–D5)</div>
      </div>
    </div>
  );
}

function StressBar({ value }: { value: number }) {
  const color = value < 30 ? '#22c55e' : value < 60 ? '#facc15' : value < 80 ? '#f97316' : '#ef4444';
  const label = value < 30 ? 'Low' : value < 60 ? 'Moderate' : value < 80 ? 'High' : 'Critical';
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">Groundwater Stress</span>
        <span className="font-bold" style={{ color }}>{value}% — {label}</span>
      </div>
      <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
      </div>
      <div className="text-xs text-slate-500">Estimated from 30-day recharge and soil moisture saturation</div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color = '#60a5fa' }: {
  icon: React.ElementType; label: string; value: string; sub: string; color?: string;
}) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 flex items-start gap-3 border border-slate-700">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + '22' }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <div className="text-xs text-slate-500 mb-0.5">{label}</div>
        <div className="text-lg font-bold text-slate-100">{value}</div>
        <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
      </div>
    </div>
  );
}

const DROUGHT_LEVELS = [
  { label: 'D0 No Drought',       color: '#22c55e' },
  { label: 'D1 Abnormally Dry',   color: '#a3e635' },
  { label: 'D2 Moderate Drought', color: '#facc15' },
  { label: 'D3 Severe Drought',   color: '#f97316' },
  { label: 'D4 Extreme Drought',  color: '#ef4444' },
  { label: 'D5 Exceptional',      color: '#7f1d1d' },
];

const PRECIP_COLOR = '#38bdf8';
const SM_COLOR     = '#a78bfa';
const ET_COLOR     = '#fb923c';

export default function DroughtPage() {
  const { connected } = useLiveData();
  const isDark = useTheme();
  const [regional, setRegional] = useState<RegionalData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [selected, setSelected] = useState<string>('Birmingham');

  // Theme-aware chart colours
  const gridStroke     = isDark ? '#1e293b' : '#e2e8f0';
  const tickFill       = isDark ? '#64748b' : '#94a3b8';
  const tooltipBg      = isDark ? '#0f172a' : '#ffffff';
  const tooltipBorder  = isDark ? '#334155' : '#e2e8f0';
  const tooltipLabel   = isDark ? '#94a3b8' : '#64748b';

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/satellite/regional`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data: RegionalData = await res.json();
      setRegional(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load satellite data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const facility = useMemo(
    () => regional?.cities.find(c => c.facility) ?? regional?.cities[0] ?? null,
    [regional]
  );

  const focus = useMemo(
    () => regional?.cities.find(c => c.name === selected) ?? facility,
    [regional, selected, facility]
  );

  const anomalyColor = !focus ? '#60a5fa'
    : focus.precipAnomaly >= 0 ? '#22c55e'
    : focus.precipAnomaly > -30 ? '#facc15' : '#ef4444';

  const tooltipStyle = {
    contentStyle: { background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8, fontSize: 12 },
    labelStyle: { color: tooltipLabel },
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Navigation connected={connected} />
      <main className="max-w-7xl mx-auto px-4 pt-20 mt-10 pb-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Drought &amp; Groundwater Stress</h1>
            <div className="flex items-center gap-1.5 text-slate-400 text-sm mt-1">
              <MapPin size={13} />
              <span>UK Regional Comparison · Facility: Birmingham, UK</span>
              {regional && (
                <span className="text-slate-600 ml-2">
                  · Updated {new Date(regional.fetchedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  · Cached 1 h
                </span>
              )}
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm border border-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-900/30 border border-red-800 text-red-300 flex items-center gap-2">
            <AlertTriangle size={16} />{error}
          </div>
        )}

        {loading && !regional && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6 animate-pulse">
            <div className="lg:col-span-3 h-[480px] bg-slate-800 rounded-2xl border border-slate-700" />
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="h-48 bg-slate-800 rounded-2xl border border-slate-700" />
              <div className="h-48 bg-slate-800 rounded-2xl border border-slate-700" />
            </div>
          </div>
        )}

        {regional && (
          <>
            {/* Map + right panel */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">

              {/* Leaflet map */}
              <div className="lg:col-span-3 bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden" style={{ height: 480 }}>
                <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-100">UK Drought Index Map</div>
                  <div className="flex flex-wrap gap-2">
                    {DROUGHT_LEVELS.map(l => (
                      <span key={l.label} className="flex items-center gap-1 text-xs text-slate-400">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: l.color }} />
                        {l.label.split(' ').slice(0, 2).join(' ')}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ height: 'calc(100% - 49px)' }}>
                  <DroughtMap
                    cities={regional.cities}
                    onSelect={setSelected}
                    selected={selected}
                    isDark={isDark}
                  />
                </div>
              </div>

              {/* Right panel */}
              <div className="lg:col-span-2 flex flex-col gap-4">

                <div className="bg-slate-900 rounded-2xl border border-slate-700 p-4">
                  <label className="text-xs text-slate-500 block mb-1.5">Inspect city</label>
                  <select
                    value={selected}
                    onChange={e => setSelected(e.target.value)}
                    className="w-full bg-slate-800 text-slate-200 text-sm rounded-lg px-3 py-2 border border-slate-700 focus:border-blue-500 outline-none"
                  >
                    {regional.cities.map(c => (
                      <option key={c.name} value={c.name}>
                        {c.name}{c.facility ? ' ⚙' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {focus && (
                  <>
                    <div className="bg-slate-900 rounded-2xl border border-slate-700 p-5 flex flex-col items-center">
                      <DroughtGauge
                        index={focus.drought.index}
                        label={focus.drought.label}
                        color={focus.drought.color}
                        isDark={isDark}
                      />
                      <div className="mt-3 grid grid-cols-6 gap-1 w-full text-center text-xs">
                        {['D0','D1','D2','D3','D4','D5'].map((d, i) => (
                          <div key={d} className="rounded py-0.5"
                            style={{
                              background: i <= focus.drought.index
                                ? focus.drought.color + '33'
                                : isDark ? '#1e293b' : '#f1f5f9',
                              color: i <= focus.drought.index ? focus.drought.color : '#64748b',
                              fontWeight: i === focus.drought.index ? 700 : 400,
                            }}
                          >{d}</div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-900 rounded-2xl border border-slate-700 p-5 flex flex-col gap-4">
                      <StressBar value={focus.groundwaterStress} />
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <StatCard icon={Droplets} label="90-day Rain" value={`${focus.totalPrecip90} mm`}
                          sub={`${focus.precipAnomaly >= 0 ? '+' : ''}${focus.precipAnomaly}% vs avg`} color={anomalyColor} />
                        <StatCard icon={Thermometer} label="90-day ET₀" value={`${focus.totalET90} mm`}
                          sub="FAO-56 Penman" color="#fb923c" />
                        <StatCard icon={Droplets} label="Soil Moisture" value={`${focus.avgSoilMoisture}%`}
                          sub="0–7 cm depth" color="#a78bfa" />
                        <StatCard icon={MapPin} label="Location" value={focus.name}
                          sub={`${focus.lat.toFixed(2)}°N ${Math.abs(focus.lon).toFixed(2)}°${focus.lon < 0 ? 'W' : 'E'}`}
                          color="#60a5fa" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Trend charts */}
            {focus && (
              <>
                <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 mb-6">
                  <div className="font-semibold text-slate-100 mb-0.5">
                    30-Day Precipitation vs ET₀ — {focus.name}
                  </div>
                  <div className="text-xs text-slate-500 mb-4">Daily rainfall vs evapotranspiration demand</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={focus.trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gprecip" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={PRECIP_COLOR} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={PRECIP_COLOR} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="get" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={ET_COLOR} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={ET_COLOR} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: tickFill }} tickFormatter={d => d.slice(5)} />
                      <YAxis tick={{ fontSize: 10, fill: tickFill }} unit=" mm" />
                      <Tooltip {...tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 12, color: tickFill }} />
                      <Area type="monotone" dataKey="precipitation" name="Precipitation (mm)" stroke={PRECIP_COLOR} fill="url(#gprecip)" strokeWidth={2} dot={false} />
                      <Area type="monotone" dataKey="et" name="ET₀ (mm)" stroke={ET_COLOR} fill="url(#get)" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6">
                  <div className="font-semibold text-slate-100 mb-0.5">Soil Moisture Saturation — {focus.name}</div>
                  <div className="text-xs text-slate-500 mb-4">0–7 cm depth · percentage of field capacity</div>
                  <ResponsiveContainer width="100%" height={170}>
                    <BarChart data={focus.trend} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: tickFill }} tickFormatter={d => d.slice(5)} />
                      <YAxis tick={{ fontSize: 10, fill: tickFill }} unit="%" domain={[0, 100]} />
                      <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, 'Soil Moisture']} />
                      <Bar dataKey="soilMoisture" name="Soil Moisture %" fill={SM_COLOR} radius={[3, 3, 0, 0]} opacity={0.85} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}

            <div className="mt-4 text-xs text-slate-600 text-center">
              Satellite-derived via Open-Meteo Historical Weather API · ERA5 reanalysis · {regional.cities.length} UK cities
            </div>
          </>
        )}
      </main>
    </div>
  );
}
