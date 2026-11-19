import { BellOff, CalendarClock, Check, PackageMinus, ThermometerSnowflake, ThermometerSun, TimerOff } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Card, EmptyState, ErrorBanner, Input, Loading, PageHeader, SEVERITY_TONE } from '../components/ui'
import { usePolling } from '../hooks/usePolling'
import { api, errorMessage } from '../services/api'
import { fmtDateTime, timeAgo } from '../utils/format'

const TYPE_INFO = {
  TEMP_HIGH: { label: 'Temperature too high', icon: ThermometerSun },
  TEMP_LOW: { label: 'Temperature too low', icon: ThermometerSnowflake },
  EXPIRING_SOON: { label: 'Expiring soon', icon: CalendarClock },
  EXPIRED: { label: 'Unit expired', icon: TimerOff },
  LOW_STOCK: { label: 'Low stock', icon: PackageMinus },
}
const ICON_TONE = { CRITICAL: 'bg-red-100 text-red-700', WARNING: 'bg-amber-100 text-amber-700', INFO: 'bg-sky-100 text-sky-700' }

const VIEWS = [
  { id: 'unacknowledged', label: 'Needs acknowledgement' },
  { id: 'active', label: 'Active conditions' },
  { id: 'all', label: 'All history' },
]

export default function Alerts() {
  const [view, setView] = useState('unacknowledged')
  const [who, setWho] = useState('Duty Officer')
  const [actionError, setActionError] = useState(null)
  const { data, error, loading, refresh } = usePolling(() => api.alerts(view), 5000, [view])

  async function ack(id) {
    setActionError(null)
    try {
      await api.acknowledgeAlert(id, who.trim() || 'Demo User')
      refresh()
    } catch (err) {
      setActionError(errorMessage(err))
    }
  }

  return (
    <>
      <PageHeader title="Alerts"
        subtitle="Raised automatically by the backend rule engine. Acknowledge = someone has taken responsibility. Resolved = the condition has cleared."
        actions={<Input label="Acknowledging as" value={who} onChange={(e) => setWho(e.target.value)} className="w-52" />} />
      <ErrorBanner message={error || actionError} />

      <div className="mb-4 flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 text-sm w-fit">
        {VIEWS.map((v) => (
          <button key={v.id} onClick={() => setView(v.id)}
            className={`rounded-md px-3 py-1.5 ${view === v.id ? 'bg-white font-medium text-slate-900 shadow-sm' : 'text-slate-600'}`}>
            {v.label}
          </button>
        ))}
      </div>

      <Card bodyClass="p-0">
        {loading && !data ? <Loading /> : !data?.length ? (
          <EmptyState icon={BellOff} title="Nothing here">
            {view === 'unacknowledged' ? 'Every alert has been acknowledged.' : 'No alerts in this view.'}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.map((a) => {
              const info = TYPE_INFO[a.alert_type] || { label: a.alert_type, icon: BellOff }
              const Icon = info.icon
              return (
                <li key={a.id} className={`flex flex-wrap items-start gap-4 px-5 py-4 ${!a.acknowledged && a.severity === 'CRITICAL' ? 'bg-red-50/50' : ''}`}>
                  <span className={`rounded-lg p-2 ${ICON_TONE[a.severity]}`}><Icon size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Badge tone={SEVERITY_TONE[a.severity]}>{a.severity}</Badge>
                      <span className="text-sm font-semibold text-slate-800">{info.label}</span>
                      {a.resolved ? <Badge tone="green">Resolved</Badge> : <Badge tone="slate">Active</Badge>}
                      {a.facility_name && <span className="text-xs text-slate-500">· {a.facility_name}</span>}
                    </div>
                    <p className="text-sm text-slate-700">{a.message}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Raised {fmtDateTime(a.created_at)} ({timeAgo(a.created_at)})
                      {a.resolved && ` · cleared ${fmtDateTime(a.resolved_at)}`}
                      {a.acknowledged && ` · acknowledged by ${a.acknowledged_by} at ${fmtDateTime(a.acknowledged_at)}`}
                    </p>
                  </div>
                  {!a.acknowledged && (
                    <Button size="sm" variant={a.severity === 'CRITICAL' ? 'primary' : 'secondary'} onClick={() => ack(a.id)}>
                      <Check size={14} /> Acknowledge
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </>
  )
}
