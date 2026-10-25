"""FastAPI app: JSON API under /api, plus the built React app (when present) at /."""
from datetime import date, time
from functools import lru_cache
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles

from . import analysis, elexon

app = FastAPI(title="Wind Forecast Monitor")

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


@lru_cache
def data():
    return elexon.load_actuals(), analysis.ForecastStore(elexon.load_forecasts())


def parse_cutoff(value: str) -> time:
    try:
        return time.fromisoformat(value)
    except ValueError:
        raise HTTPException(422, "cutoff must be HH:MM")


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/meta")
def meta():
    return {
        "deliveryStart": elexon.DELIVERY_START.isoformat(),
        "deliveryEnd": elexon.DELIVERY_END.isoformat(),
        "defaultCutoff": "11:00",  # GB day-ahead auction gate closure (UK time, D-1)
        "source": "Elexon BMRS: FUELHH (fuelType=WIND) and WINDFOR",
    }


@app.get("/api/decision")
def decision(cutoff: str = Query("11:00", description="Decision time on D-1, UK local, HH:MM"),
             start: date = elexon.DELIVERY_START, end: date = elexon.DELIVERY_END):
    actuals, store = data()
    return analysis.decision_view(actuals, store, start, end, parse_cutoff(cutoff))


@app.get("/api/horizon")
def horizon(start: date = elexon.DELIVERY_START, end: date = elexon.DELIVERY_END):
    actuals, store = data()
    return analysis.horizon_view(actuals, store, start, end)


# In Docker the React build is copied to backend/static and served from the same origin.
if STATIC_DIR.exists():
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
