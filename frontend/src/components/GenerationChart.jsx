import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { gw, ukDateTime, ukTime } from '../format'

export default function GenerationChart({ points, singleDay }) {
  const data = points.map((p) => ({ ...p, t: new Date(p.startTime).getTime() }))
  // One tick per delivery day (or every 3 hours for a single day) so labels never repeat.
  const ticks = singleDay
    ? data.filter((p) => p.hour % 3 === 0).map((p) => p.t)
    : data.filter((p, i) => i === 0 || p.deliveryDate !== data[i - 1].deliveryDate).map((p) => p.t)
  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--grid)" />
        <XAxis
          dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} ticks={ticks}
          tickFormatter={(t) => (singleDay ? ukTime(t) : new Date(t).toLocaleDateString('en-GB', { timeZone: 'Europe/London', day: 'numeric' }))}
          stroke="var(--muted)" fontSize={12}
        />
        <YAxis tickFormatter={(v) => (v / 1000).toFixed(0)} unit=" GW" stroke="var(--muted)" fontSize={12} width={60} />
        <Tooltip
          labelFormatter={(t) => ukDateTime(t)}
          formatter={(v, name) => [gw(v), name]}
          contentStyle={{ background: 'var(--card)', border: '1px solid var(--grid)' }}
        />
        <Legend />
        <Line dataKey="actual" name="Actual wind" stroke="var(--actual)" dot={false} strokeWidth={2} isAnimationActive={false} />
        <Line dataKey="forecast" name="Forecast (when ordering)" stroke="var(--forecast)" dot={false} strokeWidth={2} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
