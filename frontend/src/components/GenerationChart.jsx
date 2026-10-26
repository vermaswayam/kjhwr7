import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { gw, ukDateTime, ukTime } from '../format'

function PointTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  const err = p.forecast - p.actual
  return (
    <div className="tooltip">
      <b>{ukDateTime(p.startTime)}</b>
      <div><i className="swatch forecast" />Forecast: {gw(p.forecast)}</div>
      <div><i className="swatch actual" />Actual: {gw(p.actual)}</div>
      <div className={err > 0 ? 'short' : 'over'}>
        {err > 0 ? `Short by ${gw(err)}` : `More wind than forecast by ${gw(-err)}`}
      </div>
      <small className="muted">Forecast published {ukDateTime(p.publishTime)} ({Math.round(p.horizonHours)} h ahead)</small>
    </div>
  )
}

export default function GenerationChart({ points, singleDay, buffer, onPickDay }) {
  const data = points.map((p) => ({
    ...p,
    t: new Date(p.startTime).getTime(),
    gap: [p.actual, p.forecast],
    planWith: Math.max(p.forecast - buffer, 0),
  }))
  // One tick per delivery day (or every 3 hours for a single day) so labels never repeat.
  const ticks = singleDay
    ? data.filter((p) => p.hour % 3 === 0).map((p) => p.t)
    : data.filter((p, i) => i === 0 || p.deliveryDate !== data[i - 1].deliveryDate).map((p) => p.t)
  return (
    <ResponsiveContainer width="100%" height={360}>
      <ComposedChart
        data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
        onClick={(e) => onPickDay && e?.activePayload && onPickDay(e.activePayload[0].payload.deliveryDate)}
        style={{ cursor: onPickDay ? 'pointer' : 'default' }}
      >
        <CartesianGrid stroke="var(--grid)" />
        <XAxis
          dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} ticks={ticks}
          tickFormatter={(t) => (singleDay ? ukTime(t) : new Date(t).toLocaleDateString('en-GB', { timeZone: 'Europe/London', day: 'numeric' }))}
          stroke="var(--muted)" fontSize={12}
        />
        <YAxis tickFormatter={(v) => (v / 1000).toFixed(0)} unit=" GW" stroke="var(--muted)" fontSize={12} width={60} />
        <Tooltip content={<PointTooltip />} />
        <Legend />
        <Area dataKey="gap" name="Gap (forecast error)" fill="var(--forecast)" fillOpacity={0.15} stroke="none" isAnimationActive={false} />
        <Line dataKey="actual" name="Actual wind" stroke="var(--actual)" dot={false} strokeWidth={2} isAnimationActive={false} />
        <Line dataKey="forecast" name="Forecast at order time" stroke="var(--forecast)" dot={false} strokeWidth={2} isAnimationActive={false} />
        <Line dataKey="planWith" name="Plan with (forecast − P90 buffer)" stroke="var(--muted)" strokeDasharray="5 4" dot={false} strokeWidth={1.5} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
