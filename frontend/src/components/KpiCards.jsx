import { gw, pct } from '../format'

// Each headline number has a plain-English name and the standard technical term.
export default function KpiCards({ metrics: m }) {
  if (!m.count) return <p className="muted">No data for this selection.</p>
  const cards = [
    {
      label: 'Typical miss', term: 'MAE', value: gw(m.mae),
      note: `How far off the forecast usually was, in either direction. ${pct(m.nmae)} of wind output (nMAE).`,
      def: 'Mean absolute error = average of |forecast − actual|',
    },
    {
      label: m.bias >= 0 ? 'Forecast too high by' : 'Forecast too low by', term: 'Bias', value: gw(Math.abs(m.bias)),
      note: m.bias >= 0 ? 'On average, wind came in below the forecast.' : 'On average, wind came in above the forecast.',
      def: 'Bias = average of (forecast − actual). Positive = over-forecast',
    },
    {
      label: 'Safety buffer', term: 'P90', value: gw(Math.max(m.p90, 0)),
      note: 'Extra backup that would have covered the shortfall in 9 out of 10 hours.',
      def: '90th percentile of (forecast − actual)',
    },
    {
      label: 'Worst shortfall', term: 'Max error', value: gw(Math.max(m.maxShortfall, 0)),
      note: 'The largest single-hour gap where wind fell short of the forecast.',
      def: 'Maximum of (forecast − actual)',
    },
  ]
  const technical = [
    ['RMSE', gw(m.rmse)], ['nMAE', pct(m.nmae)], ['P10', gw(m.p10)], ['P50 (median)', gw(m.p50)],
    ['P90', gw(m.p90)], ['Max over-forecast', gw(m.maxShortfall)], ['Max under-forecast', gw(m.maxSurplus)],
    ['Hours (n)', m.count],
  ]
  return (
    <>
      <div className="kpis">
        {cards.map((c) => (
          <div className="kpi" key={c.term} title={c.def}>
            <span className="kpi-label">{c.label}<span className="badge">{c.term}</span></span>
            <strong>{c.value}</strong>
            <small className="muted">{c.note}</small>
          </div>
        ))}
      </div>
      <div className="tech" aria-label="Technical metrics">
        <span className="tech-title">Technical metrics · error = forecast − actual</span>
        {technical.map(([k, v]) => <span key={k}><span className="muted">{k}</span> {v}</span>)}
      </div>
    </>
  )
}
