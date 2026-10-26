import { useEffect, useState } from 'react'
import { fetchDecision, fetchHorizon, fetchMeta } from './api'
import { downloadCsv, shortDate, ukDateTime } from './format'
import KpiCards from './components/KpiCards'
import GenerationChart from './components/GenerationChart'
import DailyAccuracyChart from './components/DailyAccuracyChart'
import HourlyErrorChart from './components/HourlyErrorChart'
import HorizonChart from './components/HorizonChart'
import Insights from './components/Insights'
import HowToRead from './components/HowToRead'

// Half-hourly cut-off options for the decision time on D-1.
const CUTOFFS = Array.from({ length: 48 }, (_, i) =>
  `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`)

// Cut-off and day live in the URL so a view can be shared as a link.
const params = new URLSearchParams(window.location.search)

export default function App() {
  const [meta, setMeta] = useState(null)
  const [cutoff, setCutoff] = useState(CUTOFFS.includes(params.get('cutoff')) ? params.get('cutoff') : '11:00')
  const [day, setDay] = useState(params.get('day') || 'all')
  const [month, setMonth] = useState(null)
  const [dayView, setDayView] = useState(null)
  const [horizon, setHorizon] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([fetchMeta(), fetchHorizon()])
      .then(([m, h]) => { setMeta(m); setHorizon(h) })
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    if (!meta) return
    setLoading(true)
    Promise.all([
      fetchDecision(cutoff, meta.deliveryStart, meta.deliveryEnd),
      day === 'all' ? null : fetchDecision(cutoff, day, day),
    ])
      .then(([m, d]) => { setMonth(m); setDayView(d) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
    const q = new URLSearchParams({ cutoff, ...(day === 'all' ? {} : { day }) })
    window.history.replaceState(null, '', `?${q}`)
  }, [meta, cutoff, day])

  if (error) return <div className="page"><p className="error">Could not load data: {error}</p></div>
  if (!meta || !month) return <div className="page"><p className="muted">Loading January 2026 wind data…</p></div>

  const days = month.byDay.map((d) => d.deliveryDate)
  const view = dayView ?? month
  const dayIndex = days.indexOf(day)
  const run = dayView?.runs[0]

  return (
    <div className={`page${loading ? ' is-loading' : ''}`}>
      <header>
        <div>
          <h1><span className="logo" aria-hidden="true" />Wind Forecast Monitor</h1>
          <p className="muted">
            How much can you rely on the wind forecast when buying tomorrow's power?
          </p>
        </div>
        <span className="pill">GB national wind · Elexon BMRS · decisions in January 2026</span>
      </header>

      <div className="toolbar">
        <label>
          Order placed at (day before, UK time)
          <select value={cutoff} onChange={(e) => setCutoff(e.target.value)}>
            {CUTOFFS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>
          Delivery day
          <span className="daynav">
            <button className="btn icon" aria-label="Previous day" disabled={dayIndex <= 0}
              onClick={() => setDay(days[dayIndex - 1])}>‹</button>
            <select value={day} onChange={(e) => setDay(e.target.value)}>
              <option value="all">Whole month ({shortDate(meta.deliveryStart)} – {shortDate(meta.deliveryEnd)})</option>
              {days.map((d) => <option key={d} value={d}>{shortDate(d)}</option>)}
            </select>
            <button className="btn icon" aria-label="Next day" disabled={dayIndex === days.length - 1}
              onClick={() => setDay(dayIndex < 0 ? days[0] : days[dayIndex + 1])}>›</button>
          </span>
        </label>
        <div className="toolbar-actions">
          {day !== 'all' && <button className="btn" onClick={() => setDay('all')}>Back to month</button>}
          <button className="btn" onClick={() => downloadCsv(view.points, `wind-forecast-${day}-cutoff-${cutoff}.csv`)}>
            Download CSV
          </button>
        </div>
      </div>

      {run && (
        <p className="banner">
          To buy power for <b>{shortDate(run.deliveryDate)}</b>, your order was due at{' '}
          <b>{ukDateTime(run.decisionAt)}</b>. The newest wind forecast available then was published at{' '}
          <b>{ukDateTime(run.publishTime)}</b>.
        </p>
      )}

      <Insights metrics={view.metrics} byHour={view.byHour} horizon={horizon} singleDay={!!dayView} />

      <KpiCards metrics={view.metrics} />

      <section className="card">
        <div className="card-head">
          <div>
            <h2>What the forecast said vs what really happened</h2>
            <p className="muted">
              Shaded area = the gap between forecast and actual. Where the forecast line is above
              actual, wind fell short. The dashed line is the forecast minus the January P90 buffer,
              a cautious figure to plan with.
              {!dayView && ' Click anywhere on the chart to zoom into that day.'}
            </p>
          </div>
        </div>
        <GenerationChart points={view.points} singleDay={!!dayView}
          buffer={Math.max(month.metrics.p90, 0)} onPickDay={dayView ? null : setDay} />
      </section>

      <section className="card">
        <h2>Which days were hardest to forecast?</h2>
        <p className="muted">
          Typical miss (MAE) for each delivery day. Orange days were worse than the month average.
          Click a bar to open that day.
        </p>
        <DailyAccuracyChart data={month.byDay} average={month.metrics.mae} selected={day} onPick={setDay} />
      </section>

      <div className="grid">
        <section className="card">
          <h2>At what time of day is the forecast least reliable?</h2>
          <p className="muted">
            Bars: typical miss (MAE) per hour. Line: bias, the average of forecast − actual. Above zero
            means the forecast was too high.
          </p>
          <HourlyErrorChart data={view.byHour} />
        </section>
        <section className="card">
          <h2>Does a fresher forecast help?</h2>
          <p className="muted">
            Error by forecast lead time (hours between publishing and delivery), across all of
            January. Lower is more accurate.
          </p>
          <HorizonChart data={horizon} />
        </section>
      </div>

      <HowToRead />

      <footer className="muted">
        Data: {meta.source}. Forecasts are hourly and are compared with actual generation for the
        same hour. The P90 buffer is measured on January 2026 data, so treat it as a guide, not a
        guarantee.
      </footer>
    </div>
  )
}
