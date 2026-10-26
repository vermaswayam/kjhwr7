import { Bar, CartesianGrid, ComposedChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { gw } from '../format'

export default function HorizonChart({ data }) {
  const rows = data.map((d) => ({ ...d, label: `${d.fromHours}–${d.toHours} h` }))
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--grid)" />
        <XAxis dataKey="label" stroke="var(--muted)" fontSize={12} />
        <YAxis tickFormatter={(v) => (v / 1000).toFixed(1)} unit=" GW" stroke="var(--muted)" fontSize={12} width={60} />
        <Tooltip
          formatter={(v, name) => [gw(v), name]}
          labelFormatter={(l) => `Forecast made ${l} ahead`}
          contentStyle={{ background: 'var(--card)', border: '1px solid var(--grid)' }}
        />
        <Legend />
        <Bar dataKey="mae" name="Typical miss" fill="var(--forecast)" isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
