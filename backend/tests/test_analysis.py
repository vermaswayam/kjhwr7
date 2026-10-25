from datetime import date, time

from fastapi.testclient import TestClient

from app import analysis
from app.main import app

ACTUALS = [
    {"startTime": "2026-01-02T00:00:00Z", "generation": 100},
    {"startTime": "2026-01-02T00:30:00Z", "generation": 110},
    {"startTime": "2026-01-02T01:00:00Z", "generation": 120},
]
FORECASTS = [
    # Published before the 11:00 cut-off on D-1 -> superseded by the 09:30 run.
    {"publishTime": "2026-01-01T07:30:00Z", "startTime": "2026-01-02T00:00:00Z", "generation": 500},
    {"publishTime": "2026-01-01T09:30:00Z", "startTime": "2026-01-02T00:00:00Z", "generation": 150},
    {"publishTime": "2026-01-01T09:30:00Z", "startTime": "2026-01-02T01:00:00Z", "generation": 100},
    # Published after the cut-off -> must never be used.
    {"publishTime": "2026-01-01T11:30:00Z", "startTime": "2026-01-02T00:00:00Z", "generation": 100},
]


def test_uses_latest_run_before_cutoff():
    view = analysis.decision_view(ACTUALS, analysis.ForecastStore(FORECASTS),
                                  date(2026, 1, 2), date(2026, 1, 2), time(11, 0))
    assert view["runs"][0]["publishTime"] == "2026-01-01T09:30:00Z"
    assert [(p["forecast"], p["actual"]) for p in view["points"]] == [(150, 100), (100, 120)]


def test_earlier_cutoff_picks_earlier_run():
    view = analysis.decision_view(ACTUALS, analysis.ForecastStore(FORECASTS),
                                  date(2026, 1, 2), date(2026, 1, 2), time(8, 0))
    assert view["runs"][0]["publishTime"] == "2026-01-01T07:30:00Z"


def test_error_metrics():
    m = analysis.error_metrics([150, 100], [100, 120])  # errors: +50, -20
    assert m["mae"] == 35
    assert m["bias"] == 15
    assert m["maxShortfall"] == 50 and m["maxSurplus"] == -20
    assert round(m["rmse"], 3) == round(((50**2 + 20**2) / 2) ** 0.5, 3)


def test_percentile():
    assert analysis.percentile([0, 10, 20, 30, 40], 50) == 20
    assert analysis.percentile([0, 10], 90) == 9


def test_horizon_buckets():
    rows = analysis.horizon_view(ACTUALS, analysis.ForecastStore(FORECASTS),
                                 date(2026, 1, 2), date(2026, 1, 2))
    # Lead times are 12.5h-16.5h, so all four forecasts land in the 12-18h bucket.
    assert [(r["fromHours"], r["count"]) for r in rows] == [(12, 4)]


def test_api_with_cached_data():
    client = TestClient(app)
    assert client.get("/api/health").json() == {"status": "ok"}
    body = client.get("/api/decision", params={"cutoff": "11:00"}).json()
    assert body["metrics"]["count"] > 0
    assert client.get("/api/decision", params={"cutoff": "bad"}).status_code == 422
    assert len(client.get("/api/horizon").json()) > 0
