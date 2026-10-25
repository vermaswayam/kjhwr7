# Wind Forecast Monitor

A web app for a UK energy company's day-ahead trading team. It answers two questions:

1. **What wind forecast was available when the purchase decision had to be made?**
2. **How accurate are those forecasts?** This tells the team how much extra (non-wind) power to buy.

Data: GB national wind from Elexon BMRS only. Actual generation comes from
[FUELHH](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream)
(`fuelType=WIND`) and forecasts from
[WINDFOR](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream).
The scope is purchase decisions made in **January 2026**, which means delivery days **2 Jan – 1 Feb 2026**.

**Live app:** _<add Vercel URL here>_

## How it works

- **Decision cut-off.** For each delivery day `D`, the app picks the **latest forecast published
  before the cut-off on `D-1`**. The default cut-off is 11:00 UK time, when the GB day-ahead
  auction closes. The cut-off can be changed in the UI. Forecasts published after it are never
  used, so the analysis matches what the trader actually saw.
- **Matching.** Forecasts are hourly and actuals are half-hourly. They are compared on the hourly
  start times that both datasets share.
- **Error** = forecast − actual. A positive error means wind came in below forecast, which is a
  shortfall the team has to buy elsewhere.
- **Metrics.**
  - MAE: mean absolute error.
  - RMSE: root mean square error.
  - Bias: average error, showing whether forecasts lean high or low.
  - nMAE: MAE as a % of average output.
  - P10/P50/P90 of the error: **P90 is the buffer that covers the shortfall in 9 out of 10 hours.**
  - Worst shortfall and worst surplus.
- **Views.**
  - KPI cards.
  - Forecast vs actual chart, for the whole month or a single delivery day. The single-day view
    also shows which forecast run was used.
  - Error by hour of day.
  - Error by forecast lead time, using every January forecast.

### Key findings (11:00 cut-off)

| | |
|---|---|
| MAE | 2.00 GW (17.7% of average output) |
| Bias | +1.73 GW: forecasts were higher than metered wind in most hours |
| P90 shortfall | 4.18 GW |
| Lead time | MAE rises from about 1.65 GW (0–6 h ahead) to about 2.3 GW (42 h+ ahead) |

## Project structure

```
backend/                 Python API (FastAPI)
  app/elexon.py          Fetches FUELHH/WINDFOR from Elexon and caches them as JSON
  app/analysis.py        Core logic: picks the forecast available at the cut-off, computes error metrics
  app/main.py            API routes (/api/meta, /api/decision, /api/horizon); serves the React build in Docker
  data/                  Cached Elexon data (committed, so the app works without calling Elexon)
  tests/                 pytest unit + API tests
  requirements*.txt      Runtime / dev dependencies
frontend/                React app (Vite + Recharts)
  src/App.jsx            Page layout, controls (cut-off, delivery day), data loading
  src/components/        KPI cards and the three charts
  src/api.js, format.js  API client and number/date formatting
api/index.py             Vercel serverless entry point (reuses backend/app)
vercel.json              Vercel build and routing config
requirements.txt         Python dependencies for Vercel
Dockerfile               Multi-stage build: builds React, then serves API + UI with uvicorn
docker-compose.yml       Starts the app with one command
.github/workflows/ci.yml CI: tests, frontend build, Docker build
```

## API

| Endpoint | Description |
|---|---|
| `GET /api/decision?cutoff=11:00&start=2026-01-02&end=2026-02-01` | Forecast available at the cut-off vs actual for each hour, plus metrics, error by hour, and which forecast run was used for each day |
| `GET /api/horizon` | Error metrics grouped by forecast lead time (6 h buckets) |
| `GET /api/meta`, `GET /api/health` | Date window and defaults; health check |

## Running the app

**Docker (recommended):**
```bash
docker compose up --build        # then open http://localhost:8000
```

**Local development:**
```bash
# backend
cd backend
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --reload    # http://localhost:8000/api/...
pytest                           # run tests

# frontend (in a second terminal)
cd frontend
npm install
npm run dev                      # http://localhost:5173 (forwards /api to :8000)
```

**Refresh data from Elexon:** `cd backend && python -m app.elexon`

**Deploy to Vercel:** import the GitHub repo in Vercel. `vercel.json` builds the React app, and
`api/index.py` runs the FastAPI backend as a serverless function. No environment variables are needed.

## Design decisions

- **Committed data cache.** January 2026 data is historical, so it is cached once. Deploys are
  reproducible and fast, and don't depend on Elexon being up.
- **Pure Python analysis (no pandas).** About 20k rows doesn't need it, and keeping the deployment
  small matters for Vercel.
- **One codebase, two deployment targets.** The same FastAPI app runs in Docker (serving the UI
  itself) and on Vercel (UI as static files, API as a function). The frontend always calls
  relative `/api` URLs.

## AI tools

This project was built with help from **Claude Code (Anthropic)**. It was used for researching the
Elexon APIs, generating code, writing tests and drafting this README. All code and results were
reviewed and checked by running the tests and the app.
