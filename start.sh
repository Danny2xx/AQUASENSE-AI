#!/bin/bash
# AquaSense AI – Start all services
# Run from the repo root: bash start.sh

ROOT="$(cd "$(dirname "$0")" && pwd)"
echo "AquaSense AI startup – root: $ROOT"

# 1. FastAPI ML service (port 8001)
echo "Starting FastAPI ML service on port 8001..."
python3 -m uvicorn services.ml.app.main:app --host 0.0.0.0 --port 8001 &
ML_PID=$!

# Wait for ML service to be ready
for i in {1..15}; do
  sleep 2
  if curl -sf http://localhost:8001/health > /dev/null 2>&1; then
    echo "  ML service ready."
    break
  fi
  echo "  Waiting for ML service... ($i)"
done

# 2. Node.js backend (port 3001)
echo "Starting Node.js backend on port 3001..."
cd "$ROOT/services/backend"
ML_SERVICE_URL=http://localhost:8001 node src/server.js &
BACKEND_PID=$!
cd "$ROOT"
sleep 3
echo "  Backend started."

# 3. Next.js frontend (port 3002)
echo "Starting Next.js frontend on port 3002..."
cd "$ROOT/apps/web"
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001 npm run dev &
FRONTEND_PID=$!
cd "$ROOT"

echo ""
echo "=============================="
echo "  AquaSense AI is running!"
echo "=============================="
echo "  Frontend:   http://localhost:3002/dashboard"
echo "  Backend:    http://localhost:3001/api/health"
echo "  ML Service: http://localhost:8001/health"
echo "  ML Docs:    http://localhost:8001/docs"
echo ""
echo "Press Ctrl+C to stop all services."

trap "echo 'Stopping...'; kill $ML_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
