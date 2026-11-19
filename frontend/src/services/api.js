// All backend calls live here. Pages never call axios directly,
// so if an endpoint changes there is only one file to update.
import axios from 'axios'

const http = axios.create({ baseURL: '/api', timeout: 10000 })

// Turn FastAPI error responses into readable messages
export function errorMessage(err) {
  const detail = err?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map((d) => `${d.loc?.at(-1)}: ${d.msg}`).join('; ')
  if (err?.code === 'ERR_NETWORK' || err?.response?.status >= 500)
    return 'Cannot reach the backend. Is it running on port 8000?'
  return err?.message || 'Something went wrong'
}

const get = (url, params) => http.get(url, { params }).then((r) => r.data)
const post = (url, body, params) => http.post(url, body, { params }).then((r) => r.data)
const patch = (url, body) => http.patch(url, body).then((r) => r.data)

export const api = {
  meta: () => get('/meta'),
  dashboard: () => get('/dashboard'),

  facilities: () => get('/facilities'),
  readings: (limit = 60) => get('/readings', { limit }),

  inventory: (filters = {}) => get('/inventory', clean(filters)),
  registerUnit: (unit) => post('/inventory', unit),
  setUnitStatus: (id, status) => patch(`/inventory/${id}/status`, { status }),
  transferUnit: (id, facility_id) => post(`/inventory/${id}/transfer`, { facility_id }),

  availability: (params) => get('/availability', params),

  alerts: (view = 'unacknowledged') => get('/alerts', { view }),
  acknowledgeAlert: (id, acknowledged_by) => post(`/alerts/${id}/acknowledge`, { acknowledged_by }),

  setFault: (zoneId, mode) => post(`/simulation/zones/${zoneId}/fault`, { mode }),
  tick: (steps = 1) => post('/simulation/tick', null, { steps }),
  resetDemo: () => post('/simulation/reset'),
}

// drop empty filter values so they are not sent as ?x=
function clean(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v != null))
}
