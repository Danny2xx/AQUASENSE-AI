#!/bin/bash
set -e

echo "=== AquaSense AI – HuggingFace Space startup ==="

# Start FastAPI ML service on internal port 8001
echo "Starting ML service (port 8001)..."
cd /app
python3 -m uvicorn services.ml.app.main:app --host 0.0.0.0 --port 8001 &
ML_PID=$!

# Wait for ML service (model download + load can take ~60s on cold start)
echo "Waiting for ML service to be ready..."
for i in $(seq 1 60); do
  sleep 5
  if curl -sf http://localhost:8001/health > /dev/null 2>&1; then
    echo "ML service ready after $((i * 5))s."
    break
  fi
  echo "  still loading... ($((i * 5))s)"
done

# Start Node.js backend on PORT (7860 in HF Space)
echo "Starting Node.js backend (port ${PORT:-7860})..."
cd /app/services/backend
ML_SERVICE_URL=http://localhost:8001 node src/server.js
