const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

export async function predictFull(readings) {
  const res = await fetch(`${ML_SERVICE_URL}/predict/full`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ readings }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ML service error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function healthCheck() {
  const res = await fetch(`${ML_SERVICE_URL}/health`, {
    signal: AbortSignal.timeout(5000),
  });
  return res.json();
}

export async function getLimits() {
  const res = await fetch(`${ML_SERVICE_URL}/limits`, {
    signal: AbortSignal.timeout(5000),
  });
  return res.json();
}

export async function getFeatureImportance() {
  const res = await fetch(`${ML_SERVICE_URL}/model/feature-importance`, {
    signal: AbortSignal.timeout(5000),
  });
  return res.json();
}
