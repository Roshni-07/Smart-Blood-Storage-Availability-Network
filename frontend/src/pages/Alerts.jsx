import { BellOff } from 'lucide-react'
import { useMemo, useState } from 'react'
import AlertItem from '../components/AlertItem'
import { useToast } from '../components/Toast'
import { Card, EmptyState, ErrorBanner, FilterDropdown, Input, LoadingState, PageHeader, Segmented } from '../components/ui'
import { usePolling } from '../hooks/usePolling'
import { api, errorMessage } from '../services/api'

const VIEWS = [
  { value: 'unacknowledged', label: 'Needs acknowledgement' },
  { value: 'active', label: 'Active conditions' },
  { value: 'all', label: 'All history' },
]

function Summary({ label, value, tone, hint }) {
  const color = tone === 'red' ? 'text-crit' : tone === 'amber' ? 'text-warn' : tone === 'green' ? 'text-ok' : 'text-ink'
  return (
    <div className="rounded-xl border border-line bg-surface px-5 py-4">
      <p className="text-[13px] text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums tracking-[-0.02em] ${value ? color : 'text-ink'}`}>{value}</p>
      <p className="mt-0.5 text-xs text-subtle">{hint}</p>
    </div>
  )
}

export default function Alerts() {
  const toast = useToast()
  const [view, setView] = useState('unacknowledged')
  const [severity, setSeverity] = useState('')
  const [who, setWho] = useState('Duty Officer')
  const [ackingId, setAckingId] = useState(null)
  const { data, error, loading, refresh } = usePolling(() => api.alerts(view), 5000, [view])
  // full history feeds the summary counts; facilities resolve zone names
  const history = usePolling(() => api.alerts('all'), 5000)
  const facilities = usePolling(api.facilities, 15000)

  const zoneNames = useMemo(() => {
    const m = {}
    facilities.data?.forEach((f) => f.zones.forEach((z) => { m[z.id] = z.name }))
    return m
  }, [facilities.data])

  async function ack(id) {
    setAckingId(id)
    try {
      await api.acknowledgeAlert(id, who.trim() || 'Demo User')
      toast.success('Alert acknowledged', `Recorded as ${who.trim() || 'Demo User'}`)
      refresh()
      history.refresh()
    } catch (err) {
      toast.error('Could not acknowledge alert', errorMessage(err))
    } finally {
      setAckingId(null)
    }
  }

  const all = history.data || []
  const open = all.filter((a) => !a.resolved)
  const counts = {
    critical: open.filter((a) => a.severity === 'CRITICAL').length,
    warning: open.filter((a) => a.severity === 'WARNING').length,
    resolved: all.filter((a) => a.resolved).length,
    unack: all.filter((a) => !a.acknowledged).length,
  }
  const rows = (data || []).filter((a) => !severity || a.severity === severity)

  return (
    <>
      <PageHeader title="Alerts"
        description="Raised automatically by the backend rule engine. Acknowledged means someone has taken responsibility; resolved means the condition has cleared."
        actions={<Input label="Acknowledging as" value={who} onChange={(e) => setWho(e.target.value)} className="w-52" />} />
      <ErrorBanner message={error || history.error} />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Summary label="Critical" value={counts.critical} tone="red" hint="Active, not yet cleared" />
        <Summary label="Warnings" value={counts.warning} tone="amber" hint="Active, not yet cleared" />
        <Summary label="Resolved" value={counts.resolved} tone="green" hint="Cleared automatically" />
        <Summary label="Awaiting acknowledgement" value={counts.unack} hint="Across all severities" />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented value={view} onChange={setView} options={VIEWS} />
        <FilterDropdown label="Severity" value={severity} onChange={(e) => setSeverity(e.target.value)} className="w-40">
          <option value="">All severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="WARNING">Warning</option>
          <option value="INFO">Info</option>
        </FilterDropdown>
      </div>

      <Card bodyClass="p-0" className="overflow-hidden">
        {loading && !data ? <LoadingState /> : !rows.length ? (
          <EmptyState icon={BellOff} title="Nothing here">
            {view === 'unacknowledged' && !severity ? 'Every alert has been acknowledged.' : 'No alerts match this view.'}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((a) => (
              <AlertItem key={a.id} alert={a} zoneName={zoneNames[a.zone_id]} onAcknowledge={ack} acknowledging={ackingId === a.id} />
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
