const UK = { timeZone: 'Europe/London' }

export const gw = (mw, digits = 2) => (mw == null ? '–' : `${(mw / 1000).toFixed(digits)} GW`)
export const pct = (v) => (v == null ? '–' : `${v.toFixed(1)}%`)
export const ukTime = (iso) =>
  new Date(iso).toLocaleTimeString('en-GB', { ...UK, hour: '2-digit', minute: '2-digit' })
export const ukDateTime = (iso) =>
  new Date(iso).toLocaleString('en-GB', { ...UK, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
export const shortDate = (isoDate) =>
  new Date(`${isoDate}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

// Export the hourly comparison so users can work with it in Excel.
export function downloadCsv(points, filename) {
  const header = ['start_time_utc', 'delivery_date', 'forecast_published_utc', 'lead_time_hours',
    'forecast_mw', 'actual_mw', 'error_mw (forecast - actual)']
  const rows = points.map((p) => [p.startTime, p.deliveryDate, p.publishTime, p.horizonHours,
    p.forecast, p.actual, p.forecast - p.actual])
  const csv = [header, ...rows].map((r) => r.join(',')).join('\n')
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}
