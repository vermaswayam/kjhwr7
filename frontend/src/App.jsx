import { useEffect, useState } from 'react'
import { fetchDecision, fetchHorizon, fetchMeta } from './api'
import { shortDate, ukDateTime } from './format'
import KpiCards from './components/KpiCards'
import GenerationChart from './components/GenerationChart'
import HourlyErrorChart from './components/HourlyErrorChart'
import HorizonChart from './components/HorizonChart'

// Half-hourly cut-off options for the decision time on D-1.
const CUTOFFS = Array.from({ length: 48 }, (_, i) =>
  `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`)

export default function App() {
  const [meta, setMeta] = useState(null)
  const [cutoff, setCutoff] = useState('11:00')
  const [day, setDay] = useState('all')
  const [decision, setDecision] = useState(null)
  const [horizon, setHorizon] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([fetchMeta(), fetchHorizon()])
      .then(([m, h]) => { setMeta(m); setHorizon(h) })
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    if (!meta) return
    const [start, end] = day === 'all' ? [meta.deliveryStart, meta.deliveryEnd] : [day, day]
    fetchDecision(cutoff, start, end).then(setDecision).catch((e) => setError(e.message))
  }, [meta, cutoff, day])

  if (error) return <div className="page"><p className="error">Could not load data: {error}</p></div>
  if (!meta || !decision) return <div className="page"><p className="muted">Loading…</p></div>

  const days = []
  for (let d = new Date(meta.deliveryStart); d <= new Date(meta.deliveryEnd); d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(d.toISOString().slice(0, 10))
  }
  const run = day === 'all' ? null : decision.runs[0]

  return (
    <div className="page">
      <header>
        <div>
          <h1>Wind Forecast Monitor</h1>
          <p className="muted">
            GB national wind · day-ahead purchase decisions for January 2026 · {meta.source}
          </p>
        </div>
        <div className="controls">
          <label>
            Decision cut-off (D-1, UK time)
            <select value={cutoff} onChange={(e) => setCutoff(e.target.value)}>
              {CUTOFFS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>
            Delivery day
            <select value={day} onChange={(e) => setDay(e.target.value)}>
              <option value="all">All ({shortDate(meta.deliveryStart)} – {shortDate(meta.deliveryEnd)})</option>
              {days.map((d) => <option key={d} value={d}>{shortDate(d)}</option>)}
            </select>
          </label>
        </div>
      </header>

      {run && (
        <p className="banner">
          For delivery on <b>{shortDate(run.deliveryDate)}</b>, the decision was due at{' '}
          <b>{ukDateTime(run.decisionAt)}</b>. The latest forecast available then was published{' '}
          <b>{ukDateTime(run.publishTime)}</b>.
        </p>
      )}

      <KpiCards metrics={decision.metrics} />

      <section className="card">
        <h2>Forecast available at decision time vs actual generation</h2>
        <GenerationChart points={decision.points} singleDay={day !== 'all'} />
      </section>

      <div className="grid">
        <section className="card">
          <h2>Error by hour of day</h2>
          <p className="muted">Where in the day the forecast misses most (error = forecast − actual).</p>
          <HourlyErrorChart data={decision.byHour} />
        </section>
        <section className="card">
          <h2>Error vs forecast lead time</h2>
          <p className="muted">All January forecasts: fresher forecasts are more accurate.</p>
          <HorizonChart data={horizon} />
        </section>
      </div>

      <footer className="muted">
        Error = forecast − actual. Positive values mean wind came in below forecast, a shortfall
        that has to be bought elsewhere. Forecasts are hourly; they are compared against actuals at
        the same start time.
      </footer>
    </div>
  )
}
