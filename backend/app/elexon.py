"""Fetch UK national wind actuals (FUELHH) and forecasts (WINDFOR) from Elexon BMRS.

Responses are cached as JSON in backend/data/ so the app runs offline and deploys
without depending on Elexon being reachable. Run `python -m app.elexon` to refresh.
"""
import json
import urllib.parse
import urllib.request
from datetime import date, timedelta
from pathlib import Path

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets"
DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# Purchase decisions made in January 2026 are for delivery days 2 Jan .. 1 Feb 2026.
DELIVERY_START = date(2026, 1, 2)
DELIVERY_END = date(2026, 2, 1)  # inclusive
# Forecasts look up to ~3 days ahead, so start a few days early to cover every lead time.
FORECAST_LOOKBACK_DAYS = 4


def _get(dataset: str, params: dict) -> list[dict]:
    url = f"{BASE_URL}/{dataset}/stream?{urllib.parse.urlencode(params)}"
    with urllib.request.urlopen(url, timeout=120) as resp:
        return json.load(resp)


def fetch_actuals() -> list[dict]:
    """Half-hourly wind generation (MW). Keeps the latest-published value per startTime."""
    rows = _get("FUELHH", {
        "settlementDateFrom": (DELIVERY_START - timedelta(days=1)).isoformat(),
        "settlementDateTo": (DELIVERY_END + timedelta(days=1)).isoformat(),
        "fuelType": "WIND",
    })
    latest: dict[str, dict] = {}
    for r in rows:
        prev = latest.get(r["startTime"])
        if prev is None or r["publishTime"] > prev["publishTime"]:
            latest[r["startTime"]] = r
    return sorted(
        ({"startTime": r["startTime"], "generation": r["generation"]} for r in latest.values()),
        key=lambda r: r["startTime"],
    )


def fetch_forecasts() -> list[dict]:
    """Hourly wind forecasts (MW), one row per (publishTime, startTime). Fetched a week at a time."""
    rows: list[dict] = []
    day = DELIVERY_START - timedelta(days=FORECAST_LOOKBACK_DAYS)
    while day <= DELIVERY_END:
        nxt = min(day + timedelta(days=7), DELIVERY_END + timedelta(days=1))
        rows += _get("WINDFOR", {
            "publishDateTimeFrom": f"{day.isoformat()}T00:00:00Z",
            "publishDateTimeTo": f"{nxt.isoformat()}T00:00:00Z",
        })
        day = nxt
    unique = {(r["publishTime"], r["startTime"]): r["generation"] for r in rows}
    return [
        {"publishTime": p, "startTime": s, "generation": g}
        for (p, s), g in sorted(unique.items())
    ]


def _cached(name: str, fetch) -> list[dict]:
    path = DATA_DIR / f"{name}.json"
    if path.exists():
        return json.loads(path.read_text())
    data = fetch()
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data))
    return data


def load_actuals() -> list[dict]:
    return _cached("actuals", fetch_actuals)


def load_forecasts() -> list[dict]:
    return _cached("forecasts", fetch_forecasts)


if __name__ == "__main__":
    for name, fetch in (("actuals", fetch_actuals), ("forecasts", fetch_forecasts)):
        (DATA_DIR / f"{name}.json").unlink(missing_ok=True)
        print(name, len(_cached(name, fetch)), "rows")
