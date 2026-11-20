import { FastForward, Thermometer } from 'lucide-react'
import { useMemo, useState } from 'react'
import TemperatureCard from '../components/TemperatureCard'
import TemperatureChart from '../components/TemperatureChart'
import { useToast } from '../components/Toast'
import { Badge, Button, Card, ErrorBanner, LoadingState, PageHeader, Segmented, Skeleton } from '../components/ui'
import { usePolling } from '../hooks/usePolling'
import { api, errorMessage } from '../services/api'
import { fmtTemp, fmtTime, plural, ZONE_SHORT } from '../utils/format'

function Stat({ label, value, tone }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-5 py-4">
      <p className="text-[13px] text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums tracking-[-0.02em] ${tone === 'red' ? 'text-crit' : tone === 'amber' ? 'text-warn' : 'text-ink'}`}>{value}</p>
    </div>
  )
}

export default function StorageMonitoring() {
  const facilities = usePolling(api.facilities, 5000)
  const readings = usePolling(() => api.readings(60), 5000)
  const toast = useToast()
  const [selected, setSelected] = useState('all')
  const [chartZoneId, setChartZoneId] = useState(null)
  const [busy, setBusy] = useState(false)

  async function run(action, success) {
    setBusy(true)
    try {
      await action()
      await Promise.all([facilities.refresh(), readings.refresh()])
      if (success) toast.success(success)
    } catch (err) {
      toast.error('Action failed', errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const all = facilities.data || []
  const list = all.filter((f) => selected === 'all' || f.id === Number(selected))
  const zones = useMemo(() => list.flatMap((f) => f.zones.map((z) => ({ ...z, facility: f }))), [list])

  if (facilities.loading && !facilities.data) return <LoadingState />

  const outCount = zones.filter((z) => z.in_range === false).length
  const faults = zones.filter((z) => z.fault_mode !== 'NONE').length
  // chart zone: user's pick, else the first out-of-range zone, else the first zone
  const chartZone = zones.find((z) => z.id === chartZoneId) ?? zones.find((z) => z.in_range === false) ?? zones[0]
  const chartReadings = chartZone ? readings.data?.[chartZone.id] : null
  const temps = chartReadings?.map((r) => r.temperature) ?? []

  const faultMsg = { HIGH: 'Warming started', LOW: 'Cooling started', NONE: 'Normal operation restored' }

  return (
    <>
      <PageHeader title="Storage monitoring"
        description="Simulated temperature and humidity sensors report once per zone every 5 seconds."
        actions={
          <Button variant="secondary" icon={FastForward} loading={busy} onClick={() => run(() => api.tick(1), 'Simulation advanced by one reading')}
            title="Generate the next reading immediately instead of waiting 5 seconds">
            Advance simulation
          </Button>
        } />
      <ErrorBanner message={facilities.error || readings.error} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Segmented value={selected} onChange={setSelected}
          options={[{ value: 'all', label: 'All facilities' }, ...all.map((f) => ({ value: String(f.id), label: f.name }))]} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Zones monitored" value={zones.length} />
        <Stat label="In range" value={zones.length - outCount} />
        <Stat label="Out of range" value={outCount} tone={outCount ? 'red' : undefined} />
        <Stat label="Simulated faults" value={faults} tone={faults ? 'amber' : undefined} />
      </div>

      {chartZone && (
        <Card className="mb-6" title="Temperature history"
          description={`${chartZone.facility.name} · ${ZONE_SHORT[chartZone.zone_type] ?? chartZone.name} · last ${chartReadings?.length ?? 0} ${plural(chartReadings?.length ?? 0, 'reading')}`}
          actions={<Badge dot tone={chartZone.in_range === false ? 'red' : 'green'}>{chartZone.in_range === false ? 'Out of range' : 'In range'}</Badge>}>
          <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted">
            <span className="flex items-center gap-2"><span className="h-0.5 w-5 rounded bg-navy" /> Temperature</span>
            <span className="flex items-center gap-2"><span className="h-3 w-5 rounded-sm bg-ok/15 ring-1 ring-ok/30" /> Allowed range ({chartZone.min_temp} to {chartZone.max_temp} °C)</span>
            <span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-crit" /> Out-of-range reading</span>
          </div>
          {chartReadings?.length ? (
            <>
              <TemperatureChart zone={chartZone} readings={chartReadings} />
              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-line pt-4 sm:grid-cols-4">
                {[['Current', fmtTemp(chartZone.current_temp)], ['Lowest in window', fmtTemp(Math.min(...temps))],
                  ['Highest in window', fmtTemp(Math.max(...temps))],
                  ['Last reading', chartZone.last_reading_at ? fmtTime(chartZone.last_reading_at) : '—']].map(([l, v]) => (
                  <div key={l}><p className="text-xs text-muted">{l}</p><p className="mt-0.5 text-sm font-semibold tabular-nums text-ink">{v}</p></div>
                ))}
              </div>
            </>
          ) : <Skeleton className="h-[340px]" />}
        </Card>
      )}

      <div className="mb-5 flex items-start gap-3 rounded-xl bg-navy/[0.05] px-4 py-3 text-[13px] leading-5 text-ink/80">
        <Thermometer size={16} className="mt-0.5 shrink-0 text-navy" />
        <span>
          <strong className="font-semibold text-ink">Try it:</strong> press <em>Warm up</em> on a refrigerator. Its temperature climbs about 1 °C per reading
          and the backend raises a critical alert within ~15 seconds. <em>Restore normal</em> brings it back and the alert resolves automatically.
          Select a zone to show its history above.
        </span>
      </div>

      <div className="space-y-8">
        {list.map((f) => (
          <section key={f.id}>
            <div className="mb-3 flex items-baseline gap-3">
              <h2 className="text-[15px] font-semibold text-ink">{f.name}</h2>
              <span className="text-[13px] text-muted">{f.location}</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {f.zones.map((z) => (
                <TemperatureCard key={z.id} zone={z} readings={readings.data?.[z.id]} busy={busy}
                  selected={chartZone?.id === z.id} onSelect={setChartZoneId}
                  onFault={(id, mode) => run(() => api.setFault(id, mode), `${z.name}: ${faultMsg[mode].toLowerCase()}`)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}
