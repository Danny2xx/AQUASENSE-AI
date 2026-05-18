const UK_CITIES = [
  { name: 'Birmingham',     lat: 52.4862, lon: -1.8904, facility: true },
  { name: 'London',         lat: 51.5074, lon: -0.1278 },
  { name: 'Manchester',     lat: 53.4808, lon: -2.2426 },
  { name: 'Leeds',          lat: 53.8008, lon: -1.5491 },
  { name: 'Sheffield',      lat: 53.3811, lon: -1.4701 },
  { name: 'Bristol',        lat: 51.4545, lon: -2.5879 },
  { name: 'Liverpool',      lat: 53.4084, lon: -2.9916 },
  { name: 'Newcastle',      lat: 54.9783, lon: -1.6178 },
  { name: 'Nottingham',     lat: 52.9548, lon: -1.1581 },
  { name: 'Leicester',      lat: 52.6369, lon: -1.1398 },
  { name: 'Southampton',    lat: 50.9097, lon: -1.4044 },
  { name: 'Oxford',         lat: 51.7520, lon: -1.2577 },
  { name: 'Cambridge',      lat: 52.2053, lon:  0.1218 },
  { name: 'Norwich',        lat: 52.6309, lon:  1.2974 },
  { name: 'York',           lat: 53.9600, lon: -1.0873 },
  { name: 'Plymouth',       lat: 50.3755, lon: -4.1427 },
  { name: 'Exeter',         lat: 50.7184, lon: -3.5339 },
  { name: 'Cardiff',        lat: 51.4816, lon: -3.1791 },
  { name: 'Swansea',        lat: 51.6214, lon: -3.9436 },
  { name: 'Edinburgh',      lat: 55.9533, lon: -3.1883 },
  { name: 'Glasgow',        lat: 55.8642, lon: -4.2518 },
  { name: 'Aberdeen',       lat: 57.1497, lon: -2.0943 },
  { name: 'Inverness',      lat: 57.4778, lon: -4.2247 },
  { name: 'Belfast',        lat: 54.5973, lon: -5.9301 },
];

function mean(arr) {
  const valid = arr.filter(v => v != null);
  if (!valid.length) return 0;
  return valid.reduce((s, v) => s + v, 0) / valid.length;
}

function computeDroughtIndex(precipMm, soilMoist, et) {
  const demand = et > 0 ? et : 1;
  const ratio = precipMm / (demand * 90);
  const smNorm = Math.min(Math.max(soilMoist, 0), 1);
  const composite = 0.6 * ratio + 0.4 * smNorm;

  if (composite >= 0.8)  return { index: 0, label: 'No Drought',          color: '#22c55e' };
  if (composite >= 0.6)  return { index: 1, label: 'Abnormally Dry',      color: '#a3e635' };
  if (composite >= 0.45) return { index: 2, label: 'Moderate Drought',    color: '#facc15' };
  if (composite >= 0.3)  return { index: 3, label: 'Severe Drought',      color: '#f97316' };
  if (composite >= 0.15) return { index: 4, label: 'Extreme Drought',     color: '#ef4444' };
  return                        { index: 5, label: 'Exceptional Drought',  color: '#7f1d1d' };
}

function computeGroundwaterStress(soilMoist, recharge30) {
  const rechargeMm = Math.max(recharge30, 0);
  const rechargeNorm = Math.min(rechargeMm / 60, 1);
  const stress = 100 - ((rechargeNorm + Math.min(soilMoist, 1)) / 2) * 100;
  return Math.round(Math.min(Math.max(stress, 0), 100));
}

async function fetchCity(city, startDate, endDate) {
  const url =
    `https://archive-api.open-meteo.com/v1/archive` +
    `?latitude=${city.lat}&longitude=${city.lon}` +
    `&start_date=${startDate}&end_date=${endDate}` +
    `&daily=precipitation_sum,et0_fao_evapotranspiration,soil_moisture_0_to_7cm_mean` +
    `&timezone=Europe%2FLondon`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();

  const daily = json.daily;
  const precip = daily.precipitation_sum;
  const et     = daily.et0_fao_evapotranspiration;
  const sm     = daily.soil_moisture_0_to_7cm_mean;
  const dates  = daily.time;

  const totalPrecip90 = precip.reduce((s, v) => s + (v ?? 0), 0);
  const totalET90     = et.reduce((s, v) => s + (v ?? 0), 0);
  const avgSM         = mean(sm) / 0.5; // normalise to 0–1

  const last30     = precip.slice(-30);
  const recharge30 = last30.reduce((s, v) => s + (v ?? 0), 0) * 0.3;

  const trend = dates.slice(-30).map((d, i) => ({
    date:          d,
    precipitation: +(precip[precip.length - 30 + i] ?? 0).toFixed(1),
    soilMoisture:  +(((sm[sm.length - 30 + i] ?? 0) / 0.5) * 100).toFixed(1),
    et:            +(et[et.length - 30 + i] ?? 0).toFixed(1),
  }));

  const drought          = computeDroughtIndex(totalPrecip90, avgSM, totalET90);
  const groundwaterStress = computeGroundwaterStress(avgSM, recharge30);
  const avgPrecipDay     = totalPrecip90 / 90;
  const precipAnomaly    = +(((avgPrecipDay - 2.5) / 2.5) * 100).toFixed(1);

  return {
    name:             city.name,
    lat:              city.lat,
    lon:              city.lon,
    facility:         city.facility ?? false,
    drought,
    groundwaterStress,
    precipAnomaly,
    totalPrecip90:    +totalPrecip90.toFixed(1),
    totalET90:        +totalET90.toFixed(1),
    avgSoilMoisture:  +(avgSM * 100).toFixed(1),
    trend,
  };
}

// --- Birmingham single-city cache ---
let singleCache     = null;
let singleCacheTime = 0;

// --- Regional (all cities) cache ---
let regionalCache     = null;
let regionalCacheTime = 0;

const CACHE_TTL = 3_600_000; // 1 hour

export async function fetchDroughtData() {
  const now = Date.now();
  if (singleCache && now - singleCacheTime < CACHE_TTL) return singleCache;

  const end   = new Date();
  const start = new Date(now - 90 * 86_400_000);
  const fmt   = d => d.toISOString().slice(0, 10);

  const birmingham = UK_CITIES.find(c => c.facility);
  const result     = await fetchCity(birmingham, fmt(start), fmt(end));

  singleCache = {
    location:   birmingham.name + ', UK',
    lat:        birmingham.lat,
    lon:        birmingham.lon,
    fetchedAt:  new Date().toISOString(),
    ...result,
  };
  singleCacheTime = now;
  return singleCache;
}

export async function fetchRegionalData() {
  const now = Date.now();
  if (regionalCache && now - regionalCacheTime < CACHE_TTL) return regionalCache;

  const end   = new Date();
  const start = new Date(now - 90 * 86_400_000);
  const fmt   = d => d.toISOString().slice(0, 10);
  const startDate = fmt(start);
  const endDate   = fmt(end);

  // Fetch all cities in parallel; skip failures gracefully
  const results = await Promise.allSettled(
    UK_CITIES.map(city => fetchCity(city, startDate, endDate))
  );

  const cities = results
    .map(r => r.status === 'fulfilled' ? r.value : null)
    .filter(Boolean);

  regionalCache = { fetchedAt: new Date().toISOString(), cities };
  regionalCacheTime = now;
  return regionalCache;
}
