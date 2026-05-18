// Birmingham, UK coordinates
const LAT = 52.4862;
const LON = -1.8904;
const LOCATION = 'Birmingham, UK';

let cache = null;
let cacheTime = 0;
const CACHE_TTL = 3_600_000; // 1 hour

function daysBetween(a, b) {
  return (b - a) / 86_400_000;
}

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function computeDroughtIndex(precipMm, soilMoist, et) {
  // Simple Palmer-like index: precipitation deficit relative to ET demand
  // Returns 0 (no drought) – 5 (exceptional drought)
  const demand = et > 0 ? et : 1;
  const ratio = precipMm / (demand * 90); // 90-day window
  // soil moisture 0–1 scale
  const smNorm = Math.min(Math.max(soilMoist, 0), 1);

  // Weighted composite: 60% precip ratio, 40% soil moisture
  const composite = 0.6 * ratio + 0.4 * smNorm;

  if (composite >= 0.8) return { index: 0, label: 'No Drought', color: '#22c55e' };
  if (composite >= 0.6) return { index: 1, label: 'Abnormally Dry', color: '#a3e635' };
  if (composite >= 0.45) return { index: 2, label: 'Moderate Drought', color: '#facc15' };
  if (composite >= 0.3) return { index: 3, label: 'Severe Drought', color: '#f97316' };
  if (composite >= 0.15) return { index: 4, label: 'Extreme Drought', color: '#ef4444' };
  return { index: 5, label: 'Exceptional Drought', color: '#7f1d1d' };
}

function computeGroundwaterStress(soilMoist, recharge30) {
  // soilMoist: 0–1 average, recharge30 mm in last 30 days
  // Stress % = 100 – (normalised recharge + soil moisture) / 2 * 100
  const rechargeMm = Math.max(recharge30, 0);
  const rechargeNorm = Math.min(rechargeMm / 60, 1); // 60 mm = good recharge
  const stress = 100 - ((rechargeNorm + Math.min(soilMoist, 1)) / 2) * 100;
  return Math.round(Math.min(Math.max(stress, 0), 100));
}

export async function fetchDroughtData() {
  const now = Date.now();
  if (cache && now - cacheTime < CACHE_TTL) return cache;

  const end = new Date();
  const start = new Date(now - 90 * 86_400_000);
  const fmt = d => d.toISOString().slice(0, 10);

  const url =
    `https://archive-api.open-meteo.com/v1/archive` +
    `?latitude=${LAT}&longitude=${LON}` +
    `&start_date=${fmt(start)}&end_date=${fmt(end)}` +
    `&daily=precipitation_sum,et0_fao_evapotranspiration,soil_moisture_0_to_7cm_mean` +
    `&timezone=Europe%2FLondon`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  const json = await res.json();

  const daily = json.daily;
  const dates = daily.time;
  const precip = daily.precipitation_sum;          // mm/day
  const et = daily.et0_fao_evapotranspiration;     // mm/day
  const sm = daily.soil_moisture_0_to_7cm_mean;    // m³/m³ (≈0–0.5)

  const totalPrecip90 = precip.reduce((s, v) => s + (v ?? 0), 0);
  const totalET90 = et.reduce((s, v) => s + (v ?? 0), 0);
  const avgSM = mean(sm.filter(v => v != null)) / 0.5; // normalise 0–1

  // Last 30 days
  const last30 = precip.slice(-30);
  const recharge30 = last30.reduce((s, v) => s + (v ?? 0), 0) * 0.3; // 30% percolates

  // 30-day trend for chart
  const trend = dates.slice(-30).map((d, i) => ({
    date: d,
    precipitation: +(precip[precip.length - 30 + i] ?? 0).toFixed(1),
    soilMoisture: +(((sm[sm.length - 30 + i] ?? 0) / 0.5) * 100).toFixed(1),
    et: +(et[et.length - 30 + i] ?? 0).toFixed(1),
  }));

  const drought = computeDroughtIndex(totalPrecip90, avgSM, totalET90);
  const groundwaterStress = computeGroundwaterStress(avgSM, recharge30);

  // Precipitation anomaly vs UK average (~2.5 mm/day)
  const avgPrecipDay = totalPrecip90 / 90;
  const precipAnomaly = +(((avgPrecipDay - 2.5) / 2.5) * 100).toFixed(1);

  cache = {
    location: LOCATION,
    lat: LAT,
    lon: LON,
    fetchedAt: new Date().toISOString(),
    drought,
    groundwaterStress,
    precipAnomaly,
    totalPrecip90: +totalPrecip90.toFixed(1),
    totalET90: +totalET90.toFixed(1),
    avgSoilMoisture: +(avgSM * 100).toFixed(1),
    trend,
  };
  cacheTime = now;
  return cache;
}
