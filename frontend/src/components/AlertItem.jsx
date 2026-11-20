import { BellOff, CalendarClock, Check, PackageMinus, ThermometerSnowflake, ThermometerSun, TimerOff } from 'lucide-react'
import { fmtDateTime, timeAgo } from '../utils/format'
import { Badge, Button, IconTile, SEVERITY_TONE } from './ui'
import { titleCase } from '../utils/format'

export const TYPE_INFO = {
  TEMP_HIGH: { label: 'Temperature too high', icon: ThermometerSun },
  TEMP_LOW: { label: 'Temperature too low', icon: ThermometerSnowflake },
  EXPIRING_SOON: { label: 'Expiring soon', icon: CalendarClock },
  EXPIRED: { label: 'Unit expired', icon: TimerOff },
  LOW_STOCK: { label: 'Low stock', icon: PackageMinus },
}
const BAR = { CRITICAL: 'bg-crimson', WARNING: 'bg-warn-dot', INFO: 'bg-navy/40' }

export default function AlertItem({ alert: a, zoneName, onAcknowledge, acknowledging, compact = false }) {
  const info = TYPE_INFO[a.alert_type] || { label: a.alert_type, icon: BellOff }
  const urgent = !a.acknowledged && a.severity === 'CRITICAL' && !a.resolved
  const where = [a.facility_name, zoneName].filter(Boolean).join(' · ')

  return (
    <li className={`relative flex gap-4 ${compact ? 'px-5 py-4' : 'px-6 py-5'} ${urgent ? 'bg-crit-soft/40' : ''} ${a.resolved ? 'opacity-80' : ''}`}>
      <span className={`absolute inset-y-0 left-0 w-[3px] ${BAR[a.severity] || BAR.INFO}`} />
      {!compact && <IconTile icon={info.icon} tone={a.severity === 'CRITICAL' ? 'red' : a.severity === 'WARNING' ? 'amber' : 'navy'} />}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="text-sm font-semibold text-ink">{info.label}</span>
          <Badge tone={SEVERITY_TONE[a.severity]} dot>{titleCase(a.severity)}</Badge>
          {!compact && (a.resolved ? <Badge tone="green">Resolved</Badge> : <Badge tone="grey">Active</Badge>)}
          {!compact && a.acknowledged && <Badge tone="navy">Acknowledged</Badge>}
        </div>
        <p className="mt-1.5 text-sm leading-5 text-ink/80">{a.message}</p>
        <p className="mt-2 text-xs leading-5 text-muted">
          {where && <>{where} · </>}
          {compact ? timeAgo(a.created_at) : <>Raised {fmtDateTime(a.created_at)} ({timeAgo(a.created_at)})</>}
          {!compact && a.resolved && <> · cleared {fmtDateTime(a.resolved_at)}</>}
          {!compact && a.acknowledged && <> · acknowledged by {a.acknowledged_by} at {fmtDateTime(a.acknowledged_at)}</>}
        </p>
      </div>
      {onAcknowledge && !a.acknowledged && (
        <div className="shrink-0 self-center">
          <Button size="sm" variant={a.severity === 'CRITICAL' ? 'accent' : 'secondary'} icon={Check}
            loading={acknowledging} onClick={() => onAcknowledge(a.id)}>Acknowledge</Button>
        </div>
      )}
    </li>
  )
}
