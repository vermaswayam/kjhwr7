import { Bar, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { gw } from '../format'

export default function HourlyErrorChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--grid)" />
        <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} stroke="var(--muted)" fontSize={12} />
        <YAxis tickFormatter={(v) => (v / 1000).toFixed(1)} unit=" GW" stroke="var(--muted)" fontSize={12} width={60} />
        <Tooltip
          labelFormatter={(h) => `${h}:00–${h + 1}:00 UK time`}
          formatter={(v, name) => [gw(v), name]}
          contentStyle={{ background: 'var(--card)', border: '1px solid var(--grid)' }}
        />
        <Legend />
        <ReferenceLine y={0} stroke="var(--muted)" />
        <Bar dataKey="mae" name="Typical miss" fill="var(--forecast)" isAnimationActive={false} />
        <Line dataKey="bias" name="Forecast too high (+) / too low (−)" stroke="var(--actual)" dot={false} strokeWidth={2} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
