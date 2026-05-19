# AquaSense AI

AquaSense AI is a predictive wastewater compliance monitoring platform. It combines a Next.js dashboard, a Node.js backend gateway, and a Python FastAPI ML service for live sensor readings, compliance risk, alerts, reports, drought context, and data quality views.

## Project Structure

```text
apps/web/             Next.js frontend dashboard
services/backend/     Express backend API and SQLite data store
services/ml/          FastAPI ML service and model pipeline
data/                 Raw, simulated, and processed datasets
docs/                 Project notes and modeling handoff docs
packages/shared/      Shared configuration
```

## Main Services

| Service | Default URL | Purpose |
| --- | --- | --- |
| Frontend | `http://localhost:3002/dashboard` | Web dashboard |
| Backend | `http://localhost:3001/api/health` | API gateway, alerts, reports, chat, satellite routes |
| ML service | `http://localhost:8001/health` | Prediction and model endpoints |
| ML docs | `http://localhost:8001/docs` | FastAPI API documentation |

## Quick Start

From the repository root:

```bash
bash start.sh
```

This starts:

1. The FastAPI ML service on port `8001`
2. The Node.js backend on port `3001`
3. The Next.js frontend on port `3002`

Press `Ctrl+C` in the terminal running `start.sh` to stop all services.

## Frontend

```bash
cd apps/web
npm install
npm run dev
```

Useful commands:

```bash
npm run build
npm run start
```

## Backend

```bash
cd services/backend
npm install
npm run dev
```

For production-style startup:

```bash
npm start
```

## ML Service

From the repository root:

```bash
python3 -m uvicorn services.ml.app.main:app --host 0.0.0.0 --port 8001
```

## Environment

Copy the example environment files before running services:

```bash
cp .env.example .env
cp services/backend/.env.example services/backend/.env
```

Set backend and frontend URLs as needed:

```text
ML_SERVICE_URL=http://localhost:8001
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

## Key Frontend Pages

| Route | Description |
| --- | --- |
| `/dashboard` | Live compliance overview and sensor charts |
| `/risk` | Predictive breach probability and risk drivers |
| `/alerts` | Active and resolved compliance alerts |
| `/reports` | Generated compliance reports |
| `/data-quality` | Sensor integrity and anomaly status |
| `/drought` | Drought and groundwater stress context |

## Notes

- The frontend uses Tailwind CSS, Next.js, React, Recharts, Leaflet, and lucide-react.
- The backend uses Express, SQLite via `better-sqlite3`, CSV parsing, and optional integrations.
- The ML service uses the Python modules under `services/ml/app`.
- Model artifacts live in `services/ml/models`.
