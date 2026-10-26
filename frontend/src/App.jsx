import { useEffect, useState } from 'react'
import { fetchDecision, fetchHorizon, fetchMeta } from './api'
import { shortDate, ukDateTime } from './format'
import KpiCards from './components/KpiCards'
import GenerationChart from './components/GenerationChart'
import HourlyErrorChart from './components/HourlyErrorChart'
import HorizonChart from './components/HorizonChart'
import Insights from './components/Insights'
import HowToRead from './components/HowToRead'

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
            How much can you rely on the wind forecast when buying tomorrow's power?
            GB national wind, purchase decisions made in January 2026.
          </p>
        </div>
        <div className="controls">
          <label>
            When do you place your order? (day before, UK time)
            <select value={cutoff} onChange={(e) => setCutoff(e.target.value)}>
              {CUTOFFS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>
            Which day are you buying for?
            <select value={day} onChange={(e) => setDay(e.target.value)}>
              <option value="all">Whole month ({shortDate(meta.deliveryStart)} – {shortDate(meta.deliveryEnd)})</option>
              {days.map((d) => <option key={d} value={d}>{shortDate(d)}</option>)}
            </select>
          </label>
        </div>
      </header>

      {run && (
        <p className="banner">
          To buy power for <b>{shortDate(run.deliveryDate)}</b>, your order was due at{' '}
          <b>{ukDateTime(run.decisionAt)}</b>. The newest wind forecast you could have used then was
          published at <b>{ukDateTime(run.publishTime)}</b>.
        </p>
      )}

      <HowToRead />

      <Insights metrics={decision.metrics} byHour={decision.byHour} horizon={horizon} />

      <KpiCards metrics={decision.metrics} />

      <section className="card">
        <h2>What the forecast said vs what really happened</h2>
        <p className="muted">
          Purple is the forecast you would have had when ordering. Green is the wind actually
          generated. Where purple is above green, you would have been short.
        </p>
        <GenerationChart points={decision.points} singleDay={day !== 'all'} />
      </section>

      <div className="grid">
        <section className="card">
          <h2>At what time of day is the forecast least reliable?</h2>
          <p className="muted">
            Bars show the typical miss for each hour. The line shows how much the forecast was too
            high (above zero) or too low (below zero).
          </p>
          <HourlyErrorChart data={decision.byHour} />
        </section>
        <section className="card">
          <h2>Does a fresher forecast help?</h2>
          <p className="muted">
            Typical miss by how far ahead the forecast was made, across all of January. Shorter bars
            mean more accurate.
          </p>
          <HorizonChart data={horizon} />
        </section>
      </div>

      <footer className="muted">
        Data: {meta.source}. Forecasts are hourly and are compared with actual generation for the
        same hour.
      </footer>
    </div>
  )
}
