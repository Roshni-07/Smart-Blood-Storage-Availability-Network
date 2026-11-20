import { Building2, MapPin, Phone } from 'lucide-react'
import { ZONE_SHORT } from '../utils/format'
import { Card, FACILITY_LABEL, FACILITY_TONE, IconTile, StatusBadge } from './ui'

function Metric({ label, value, tone }) {
  return (
    <div>
      <p className={`text-xl font-semibold tabular-nums tracking-[-0.01em] ${tone === 'red' ? 'text-crit' : 'text-ink'}`}>{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  )
}

export default function FacilityCard({ f }) {
  const inRange = f.zones.filter((z) => z.in_range !== false).length
  return (
    <Card bodyClass="p-5" className={f.status === 'CRITICAL' ? 'border-crit/40' : ''}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <IconTile icon={Building2} tone="navy" />
          <div className="min-w-0">
            <p className="text-[15px] font-semibold leading-5 text-ink">{f.name}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted"><MapPin size={12} className="shrink-0" />{f.location}</p>
          </div>
        </div>
        <StatusBadge tone={FACILITY_TONE[f.status]}>{FACILITY_LABEL[f.status]}</StatusBadge>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4">
        <Metric label="Zones in range" value={`${inRange}/${f.zones.length}`} tone={inRange < f.zones.length ? 'red' : undefined} />
        <Metric label="Units available" value={f.available_units} />
        <Metric label="Open alerts" value={f.open_alerts} tone={f.open_alerts ? 'red' : undefined} />
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {f.zones.map((z) => (
          <span key={z.id} className="inline-flex items-center gap-1.5 rounded-md bg-canvas px-2 py-1 text-xs text-muted">
            <span className={`size-1.5 rounded-full ${z.in_range === false ? 'bg-crit' : z.in_range ? 'bg-ok' : 'bg-subtle'}`} />
            {ZONE_SHORT[z.zone_type] ?? z.name}
          </span>
        ))}
      </div>
      {f.contact && <p className="mt-4 flex items-center gap-1.5 text-xs text-muted"><Phone size={12} /> {f.contact}</p>}
    </Card>
  )
}
