# AI Market Regime & Crash Prediction System

Production-ready scaffold for real-time market regime detection and crash risk prediction.

## Backend (FastAPI)

### Install

```bash
cd backend
pip install -r requirements.txt
```

### Train models

```bash
python -m backend.app.models.train_model
```

This writes:

- `dataset/historical_market_data.csv`
- `models/crash_model.pkl`
- `models/regime_model.pkl`

### Run API

```bash
uvicorn backend.app.main:app --reload
```

Available endpoints:

- `GET /market-data`
- `GET /market-risk` (cached for 5 minutes)

## Frontend (Next.js + React + Chart.js)

```bash
cd frontend
npm install
npm run dev
```

Frontend reads API from:

- `NEXT_PUBLIC_API_BASE` (default: `http://127.0.0.1:8000`)
