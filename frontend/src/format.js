const UK = { timeZone: 'Europe/London' }

export const gw = (mw, digits = 2) => (mw == null ? '–' : `${(mw / 1000).toFixed(digits)} GW`)
export const pct = (v) => (v == null ? '–' : `${v.toFixed(1)}%`)
export const ukTime = (iso) =>
  new Date(iso).toLocaleTimeString('en-GB', { ...UK, hour: '2-digit', minute: '2-digit' })
export const ukDateTime = (iso) =>
  new Date(iso).toLocaleString('en-GB', { ...UK, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
export const shortDate = (isoDate) =>
  new Date(`${isoDate}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
