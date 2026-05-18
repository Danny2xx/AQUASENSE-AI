const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export async function fetchLatest() {
  const res = await fetch(`${BASE}/api/latest`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchHistory(facilityId = 'demo-food-processing-plant', limit = 100) {
  const res = await fetch(`${BASE}/api/facilities/${facilityId}/history?limit=${limit}`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchAlerts(facilityId = 'demo-food-processing-plant', limit = 50): Promise<{ alerts: any[]; total: number; activeCounts: Record<string, number> }> {
  const res = await fetch(`${BASE}/api/alerts?facility_id=${facilityId}&limit=${limit}`, { cache: 'no-store' });
  if (!res.ok) return { alerts: [], total: 0, activeCounts: {} };
  return res.json();
}

export async function generateReport(facilityId = 'demo-food-processing-plant') {
  const res = await fetch(`${BASE}/api/reports/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ facility_id: facilityId }),
  });
  if (!res.ok) throw new Error('Failed to generate report');
  return res.json();
}

export async function fetchReports(facilityId = 'demo-food-processing-plant') {
  const res = await fetch(`${BASE}/api/reports?facility_id=${facilityId}`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function acknowledgeAlert(id: number) {
  return fetch(`${BASE}/api/alerts/${id}/acknowledge`, { method: 'PATCH' });
}

export const SSE_URL = `${BASE}/api/stream/live`;
