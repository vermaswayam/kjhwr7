import { gw } from '../format'

// Plain-English takeaways generated from the numbers, for non-technical readers.
function buildInsights(m, byHour, horizon) {
  const out = [
    `In a typical hour, the forecast was off by ${gw(m.mae, 1)}, about ${Math.round(m.nmae)}% of the wind actually generated.`,
  ]
  if (Math.abs(m.bias) > 0.1 * m.mae) {
    out.push(m.bias > 0
      ? `Forecasts tended to be too optimistic: on average there was ${gw(m.bias, 1)} less wind than forecast. Plan for less wind than the forecast says.`
      : `Forecasts tended to be too cautious: on average there was ${gw(-m.bias, 1)} more wind than forecast.`)
  }
  if (m.p90 > 0) {
    out.push(`Keeping ${gw(m.p90, 1)} of extra backup on top of the forecast would have covered the shortfall in 9 out of 10 hours.`)
  }
  const worst = byHour.filter((h) => h.mae != null).sort((a, b) => b.mae - a.mae)[0]
  if (worst) {
    out.push(`Forecasts were least reliable around ${worst.hour}:00–${worst.hour + 1}:00, when the typical miss was ${gw(worst.mae, 1)}.`)
  }
  const fresh = horizon[0]
  const old = horizon.find((h) => h.fromHours === 48)
  if (fresh && old) {
    const better = Math.round((1 - fresh.mae / old.mae) * 100)
    out.push(`Fresher forecasts are better: forecasts made a few hours ahead missed ${better}% less than those made two days ahead (all of January).`)
  }
  return out
}

export default function Insights({ metrics, byHour, horizon }) {
  if (!metrics.count) return null
  return (
    <section className="card insights">
      <h2>Key takeaways</h2>
      <ul>
        {buildInsights(metrics, byHour, horizon).map((text) => <li key={text}>{text}</li>)}
      </ul>
    </section>
  )
}
