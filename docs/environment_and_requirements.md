# Environment and Requirements

This project uses a local Python virtual environment at:

```text
.venv/
```

## Python Environment

The virtual environment was created with Miniconda's stable Python build:

```text
Python 3.13.12
```

`pyvenv.cfg` details:

```text
home = /Users/dannyyy/miniconda/bin
include-system-site-packages = false
version = 3.13.12
executable = /Users/dannyyy/miniconda/bin/python3.13
command = /Users/dannyyy/miniconda/bin/python -m venv /Users/dannyyy/Documents/AQUASENSE AI/.venv
```

The system `python3` was not used because it pointed to a Python `3.15.0a2` alpha build, which is too risky for a data/ML project.

## Activate the Environment

From the project root:

```bash
source .venv/bin/activate
```

Check the active Python:

```bash
python --version
```

Expected:

```text
Python 3.13.12
```

## Install Requirements

From the project root:

```bash
.venv/bin/python -m pip install -r requirements.txt
```

## Verify Installation

Check for dependency conflicts:

```bash
.venv/bin/python -m pip check
```

Current result:

```text
No broken requirements found.
```

Smoke-test core imports:

```bash
.venv/bin/python -c "import fastapi, pandas, sklearn, numpy; print('ok')"
```

Expected:

```text
ok
```

## Requirements by Purpose

### API and Service Layer

```text
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
pydantic>=2.8.0
python-dotenv>=1.0.1
httpx>=0.27.0
```

Used for the future FastAPI ML service, typed request/response models, environment config, and service-to-service HTTP calls.

### Data Processing and Machine Learning

```text
numpy>=2.0.0
pandas>=2.2.0
scikit-learn>=1.5.0
joblib>=1.4.0
```

Used for data generation, data cleaning, feature engineering, soft-sensor validation, and model training.

### Notebooks and Visualization

```text
matplotlib>=3.9.0
seaborn>=0.13.0
jupyterlab>=4.2.0
```

Used for data acquisition notebooks, forensic time-series EDA, and presentation-ready charts.

### Reporting and Developer Utilities

```text
reportlab>=4.2.0
rich>=13.7.0
pytest>=8.3.0
```

Used for future report generation, cleaner terminal output, and tests.

## Current `requirements.txt`

```text
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
pydantic>=2.8.0
python-dotenv>=1.0.1
httpx>=0.27.0

numpy>=2.0.0
pandas>=2.2.0
scikit-learn>=1.5.0
joblib>=1.4.0

matplotlib>=3.9.0
seaborn>=0.13.0
jupyterlab>=4.2.0

reportlab>=4.2.0
rich>=13.7.0
pytest>=8.3.0
```

## Compatibility Note

Python `3.11` is often the conservative default for many production ML projects, but this project currently works with Python `3.13.12`.

The installed packages resolved successfully, `pip check` reports no broken requirements, and the core imports were tested.

Recommendation:

```text
Keep the current .venv for the MVP unless a future package specifically requires Python 3.11.
```

If that happens, recreate `.venv` using Python `3.11` and reinstall from `requirements.txt`.
