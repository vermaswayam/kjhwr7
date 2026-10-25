async function get(path, params = {}) {
  const res = await fetch(`/api/${path}?${new URLSearchParams(params)}`)
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`)
  return res.json()
}

export const fetchMeta = () => get('meta')
export const fetchDecision = (cutoff, start, end) => get('decision', { cutoff, start, end })
export const fetchHorizon = () => get('horizon')
