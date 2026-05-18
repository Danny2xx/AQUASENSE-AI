#!/bin/bash
# Run from the repo root: bash services/ml/start.sh
cd "$(dirname "$0")/../.."
python3 -m uvicorn services.ml.app.main:app --host 0.0.0.0 --port 8001 --reload
