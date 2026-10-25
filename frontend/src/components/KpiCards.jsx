import { gw, pct } from '../format'

export default function KpiCards({ metrics: m }) {
  if (!m.count) return <p className="muted">No data for this selection.</p>
  const cards = [
    { label: 'Mean absolute error', value: gw(m.mae), note: `${pct(m.nmae)} of average output` },
    { label: 'Bias', value: gw(m.bias), note: m.bias > 0 ? 'Forecast runs high on average' : 'Forecast runs low on average' },
    { label: 'P90 shortfall', value: gw(m.p90), note: 'Covers the shortfall in 9 of 10 hours' },
    { label: 'Worst shortfall', value: gw(m.maxShortfall), note: `RMSE ${gw(m.rmse)}` },
    { label: 'Hours analysed', value: m.count, note: `Median error ${gw(m.p50)}` },
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
