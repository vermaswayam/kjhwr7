import { gw } from '../format'

export default function KpiCards({ metrics: m }) {
  if (!m.count) return <p className="muted">No data for this selection.</p>
  const cards = [
    {
      label: 'Typical miss',
      value: gw(m.mae),
      note: `How far off the forecast usually was, in either direction (${Math.round(m.nmae)}% of wind output).`,
    },
    {
      label: m.bias >= 0 ? 'Forecast too high by' : 'Forecast too low by',
      value: gw(Math.abs(m.bias)),
      note: m.bias >= 0 ? 'On average, wind came in below the forecast.' : 'On average, wind came in above the forecast.',
    },
    {
      label: 'Safety buffer (90%)',
      value: gw(Math.max(m.p90, 0)),
      note: 'Extra backup that would have covered the shortfall in 9 out of 10 hours.',
    },
    {
      label: 'Worst shortfall',
      value: gw(Math.max(m.maxShortfall, 0)),
      note: 'The largest single-hour gap where wind fell short of the forecast.',
    },
    {
      label: 'Hours compared',
      value: m.count,
      note: 'Each hour compares the forecast you would have had against what actually happened.',
    },
  ]
  return (
    <div className="kpis">
      {cards.map((c) => (
        <div className="kpi" key={c.label}>
          <span className="muted">{c.label}</span>
          <strong>{c.value}</strong>
          <small className="muted">{c.note}</small>
        </div>
      ))}
    </div>
  )
}
