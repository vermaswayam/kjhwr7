import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { gw, shortDate } from '../format'

function DayTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="tooltip">
      <b>{shortDate(d.deliveryDate)}</b>
      <div>Typical miss (MAE): {gw(d.mae)}</div>
      <div>Bias: {gw(d.bias)}</div>
      <div>Worst shortfall: {gw(Math.max(d.maxShortfall, 0))}</div>
      <small className="muted">Click to open this day</small>
    </div>
  )
}

export default function DailyAccuracyChart({ data, average, selected, onPick }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 8, right: 70, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis dataKey="deliveryDate" tickFormatter={(d) => Number(d.slice(8))} stroke="var(--muted)" fontSize={12} interval={0} />
        <YAxis tickFormatter={(v) => (v / 1000).toFixed(1)} unit=" GW" stroke="var(--muted)" fontSize={12} width={60} />
        <Tooltip content={<DayTooltip />} cursor={{ fill: 'var(--grid)' }} />
        <ReferenceLine y={average} stroke="var(--muted)" strokeDasharray="4 4"
          label={{ value: 'Month avg', position: 'right', fill: 'var(--muted)', fontSize: 12 }} />
        <Bar dataKey="mae" name="Typical miss (MAE)" isAnimationActive={false} cursor="pointer"
          onClick={(d) => onPick(d.deliveryDate)}>
          {data.map((d) => (
            <Cell key={d.deliveryDate}
              fill={d.deliveryDate === selected ? 'var(--text)' : d.mae > average ? 'var(--warn)' : 'var(--forecast)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
