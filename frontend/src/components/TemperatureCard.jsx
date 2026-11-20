import { Droplets, Flame, RotateCcw, Snowflake } from 'lucide-react'
import { fmtTemp, timeAgo, ZONE_SHORT } from '../utils/format'
import RangeGauge from './RangeGauge'
import TemperatureChart from './TemperatureChart'
import { Badge, Button } from './ui'

export default function TemperatureCard({ zone, readings, selected, onSelect, onFault, busy }) {
  const out = zone.in_range === false
  return (
    <div className={`flex flex-col rounded-xl border bg-surface transition-colors ${
      selected ? 'border-navy ring-4 ring-navy/[0.07]' : out ? 'border-crit/40' : 'border-line'}`}>
      <button type="button" onClick={() => onSelect(zone.id)} aria-pressed={selected}
        className="flex w-full items-start justify-between gap-3 rounded-t-xl p-5 pb-0 text-left">
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-ink">{ZONE_SHORT[zone.zone_type] ?? zone.name}</span>
          <span className="block truncate text-xs text-muted">{zone.name}</span>
        </span>
        <Badge dot tone={zone.in_range == null ? 'grey' : out ? 'red' : 'green'}>
          {zone.in_range == null ? 'No data' : out ? 'Out of range' : 'In range'}
        </Badge>
      </button>

      <div className="px-5 pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className={`text-[32px] font-semibold leading-none tracking-[-0.02em] tabular-nums ${out ? 'text-crit' : 'text-ink'}`}>{fmtTemp(zone.current_temp)}</p>
          <p className="text-xs text-muted">Allowed <span className="font-medium text-ink tabular-nums">{zone.min_temp} to {zone.max_temp} °C</span></p>
        </div>
        <div className="mt-3"><RangeGauge min={zone.min_temp} max={zone.max_temp} value={zone.current_temp} /></div>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted">
          <span className="flex items-center gap-1"><Droplets size={12} /> {zone.current_humidity ?? '—'}% humidity</span>
          <span>{zone.unit_count} units stored</span>
          <span>Updated {zone.last_reading_at ? timeAgo(zone.last_reading_at) : '—'}</span>
        </div>
      </div>

      <div className="mt-2 px-3">
        {readings?.length ? <TemperatureChart zone={zone} readings={readings} compact /> : <div className="h-14" />}
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3">
        <span className="w-full text-xs text-muted">
          {zone.fault_mode === 'NONE' ? 'Simulation: normal'
            : <Badge tone="amber" dot>Simulated {zone.fault_mode === 'HIGH' ? 'warming' : 'cooling'}</Badge>}
        </span>
        {zone.fault_mode === 'NONE' ? (
          <>
            <Button size="sm" variant="secondary" icon={Flame} disabled={busy} onClick={() => onFault(zone.id, 'HIGH')}>Warm up</Button>
            <Button size="sm" variant="secondary" icon={Snowflake} disabled={busy} onClick={() => onFault(zone.id, 'LOW')}>Cool down</Button>
          </>
        ) : (
          <Button size="sm" variant="primary" icon={RotateCcw} disabled={busy} onClick={() => onFault(zone.id, 'NONE')}>Restore normal</Button>
        )}
      </div>
    </div>
  )
}
