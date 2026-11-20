export const fmtTemp = (t) => (t == null ? '—' : `${t.toFixed(1)} °C`)

export const fmtDate = (d) =>
  d ? new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'

export const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''

export function timeAgo(d) {
  if (!d) return ''
  const s = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return `${Math.floor(s / 86400)} d ago`
}

export function expiryLabel(days) {
  if (days < 0) return `expired ${-days}d ago`
  if (days === 0) return 'expires today'
  if (days === 1) return '1 day left'
  return `${days} days left`
}

export const ZONE_SHORT = {
  REFRIGERATOR: 'Refrigerator',
  PLATELET_INCUBATOR: 'Platelet incubator',
  PLASMA_FREEZER: 'Plasma freezer',
}

export const titleCase = (s) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : '')
export const plural = (n, one, many = `${one}s`) => (n === 1 ? one : many)
