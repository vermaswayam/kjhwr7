"""Core logic: which forecast was available at decision time, and how wrong was it?

Error convention: error = forecast - actual (MW).
Positive error = wind came in BELOW forecast = shortfall the utility must cover.
"""
import bisect
import math
from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

LONDON = ZoneInfo("Europe/London")
HORIZON_BUCKET_HOURS = 6
MAX_HORIZON_HOURS = 72


def parse_ts(ts: str) -> datetime:
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))


def to_iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def percentile(values: list[float], q: float) -> float:
    """Linear-interpolated percentile, q in [0, 100]."""
    s = sorted(values)
    k = (len(s) - 1) * q / 100
    lo, hi = math.floor(k), math.ceil(k)
    return s[lo] + (s[hi] - s[lo]) * (k - lo)


def error_metrics(forecast: list[float], actual: list[float]) -> dict:
    errors = [f - a for f, a in zip(forecast, actual)]
    n = len(errors)
    if n == 0:
        return {"count": 0}
    mae = sum(abs(e) for e in errors) / n
    return {
        "count": n,
        "mae": mae,
        "rmse": math.sqrt(sum(e * e for e in errors) / n),
        "bias": sum(errors) / n,
        "nmae": mae / (sum(actual) / n) * 100,  # % of mean actual generation
        "maxShortfall": max(errors),
        "maxSurplus": min(errors),
        "p10": percentile(errors, 10),
        "p50": percentile(errors, 50),
        "p90": percentile(errors, 90),
    }


class ForecastStore:
    """Indexes forecasts by publish run so 'latest run before time T' is a binary search."""

    def __init__(self, forecasts: list[dict]):
        runs: dict[datetime, dict[str, float]] = defaultdict(dict)
        for r in forecasts:
            runs[parse_ts(r["publishTime"])][r["startTime"]] = r["generation"]
        self.publish_times = sorted(runs)
        self.runs = runs

    def latest_run_before(self, cutoff: datetime) -> datetime | None:
        i = bisect.bisect_right(self.publish_times, cutoff)
        return self.publish_times[i - 1] if i else None


def delivery_days(start: date, end: date):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)


def decision_view(actuals: list[dict], store: ForecastStore, start: date, end: date,
                  cutoff: time) -> dict:
    """For each delivery day D, use the latest forecast published before `cutoff` (UK time) on D-1.

    Forecasts are hourly and actuals half-hourly, so points are compared on the hourly
    start times where both exist.
    """
    actual_by_time = {r["startTime"]: r["generation"] for r in actuals}
    points, runs = [], []
    for day in delivery_days(start, end):
        decision_at = datetime.combine(day - timedelta(days=1), cutoff, LONDON)
        run = store.latest_run_before(decision_at)
        if run is None:
            continue
        runs.append({"deliveryDate": day.isoformat(), "decisionAt": to_iso(decision_at),
                     "publishTime": to_iso(run)})
        day_start = datetime.combine(day, time(0), LONDON)
        day_end = datetime.combine(day + timedelta(days=1), time(0), LONDON)
        for ts, fc in sorted(store.runs[run].items()):
            t = parse_ts(ts)
            if day_start <= t < day_end and ts in actual_by_time:
                points.append({
                    "startTime": ts,
                    "deliveryDate": day.isoformat(),
                    "hour": t.astimezone(LONDON).hour,
                    "forecast": fc,
                    "actual": actual_by_time[ts],
                    "publishTime": to_iso(run),
                    "horizonHours": (t - run).total_seconds() / 3600,
                })

    by_hour = []
    for h in range(24):
        hp = [p for p in points if p["hour"] == h]
        m = error_metrics([p["forecast"] for p in hp], [p["actual"] for p in hp])
        by_hour.append({"hour": h, "mae": m.get("mae"), "bias": m.get("bias"),
                        "p90": m.get("p90")})

    by_day = []
    for r in runs:
        dp = [p for p in points if p["deliveryDate"] == r["deliveryDate"]]
        m = error_metrics([p["forecast"] for p in dp], [p["actual"] for p in dp])
        by_day.append({"deliveryDate": r["deliveryDate"], "mae": m.get("mae"),
                       "bias": m.get("bias"), "maxShortfall": m.get("maxShortfall")})

    return {
        "cutoff": cutoff.strftime("%H:%M"),
        "metrics": error_metrics([p["forecast"] for p in points], [p["actual"] for p in points]),
        "points": points,
        "runs": runs,
        "byHour": by_hour,
        "byDay": by_day,
    }


def horizon_view(actuals: list[dict], store: ForecastStore, start: date, end: date) -> list[dict]:
    """Error of ALL forecasts for the delivery window, grouped by lead time (target - publish)."""
    actual_by_time = {r["startTime"]: r["generation"] for r in actuals}
    window_start = datetime.combine(start, time(0), LONDON)
    window_end = datetime.combine(end + timedelta(days=1), time(0), LONDON)
    buckets: dict[int, tuple[list, list]] = defaultdict(lambda: ([], []))
    for run, values in store.runs.items():
        for ts, fc in values.items():
            t = parse_ts(ts)
            lead = (t - run).total_seconds() / 3600
            if not (window_start <= t < window_end) or ts not in actual_by_time:
                continue
            if not (0 <= lead < MAX_HORIZON_HOURS):
                continue
            b = int(lead // HORIZON_BUCKET_HOURS) * HORIZON_BUCKET_HOURS
            buckets[b][0].append(fc)
            buckets[b][1].append(actual_by_time[ts])
    return [
        {"fromHours": b, "toHours": b + HORIZON_BUCKET_HOURS, **error_metrics(*buckets[b])}
        for b in sorted(buckets)
    ]
