import { Droplets, FastForward, Flame, RotateCcw, Snowflake, Thermometer } from 'lucide-react'
import { useState } from 'react'
import {
  CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Badge, Button, Card, ErrorBanner, Loading, PageHeader } from '../components/ui'
import { usePolling } from '../hooks/usePolling'
import { api, errorMessage } from '../services/api'
import { fmtTemp, fmtTime, timeAgo } from '../utils/format'

const LINE = '#2a78d6'
const CRITICAL = '#d03b3b'

function ReadingTooltip({ active, payload, zone }) {
  if (!active || !payload?.length) return null
  const r = payload[0].payload
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="text-slate-500">{fmtTime(r.recorded_at)}</p>
      <p className="font-semibold tabular-nums text-slate-900">{fmtTemp(r.temperature)} · {r.humidity}% RH</p>
      <p className={r.in_range ? 'text-emerald-700' : 'text-red-700'}>
        {r.in_range ? 'Within' : 'Outside'} {zone.min_temp}–{zone.max_temp} °C
      </p>
    </div>
  )
}

function OutOfRangeDot({ cx, cy, payload }) {
  if (payload.in_range || cx == null) return null
  return <circle cx={cx} cy={cy} r={4} fill={CRITICAL} stroke="#fff" strokeWidth={2} />
}

function ZoneChart({ zone, readings }) {
  const temps = readings.map((r) => r.temperature)
  const lo = Math.min(zone.min_temp, ...temps)
  const hi = Math.max(zone.max_temp, ...temps)
  const pad = Math.max(1, (hi - lo) * 0.15)
  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={readings} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#e1e0d9" />
          <ReferenceArea y1={zone.min_temp} y2={zone.max_temp} fill="#0ca30c" fillOpacity={0.07} />
          <ReferenceLine y={zone.max_temp} stroke={CRITICAL} strokeDasharray="4 4" strokeOpacity={0.6} />
          <ReferenceLine y={zone.min_temp} stroke={CRITICAL} strokeDasharray="4 4" strokeOpacity={0.6} />
          <XAxis dataKey="recorded_at" tickFormatter={fmtTime} minTickGap={50} tickLine={false}
            axisLine={{ stroke: '#c3c2b7' }} tick={{ fill: '#898781', fontSize: 10 }} />
          <YAxis domain={[Math.floor(lo - pad), Math.ceil(hi + pad)]} tickLine={false} axisLine={false}
            tick={{ fill: '#898781', fontSize: 10 }} width={48} />
          <Tooltip content={<ReadingTooltip zone={zone} />} cursor={{ stroke: '#94a3b8', strokeWidth: 1 }} />
          <Line type="monotone" dataKey="temperature" stroke={LINE} strokeWidth={2} dot={<OutOfRangeDot />}
            activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function ZoneCard({ zone, readings, onFault, busy }) {
  const out = zone.in_range === false
  return (
    <div className={`rounded-xl border bg-white shadow-sm ${out ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-2 px-4 pt-4">
        <div>
          <p className="text-sm font-semibold text-slate-800">{zone.name}</p>
          <p className="text-xs text-slate-500">Allowed {zone.min_temp} to {zone.max_temp} °C · setpoint {zone.setpoint} °C</p>
        </div>
        {out ? <Badge tone="red">Out of range</Badge> : <Badge tone="green">In range</Badge>}
      </div>

      <div className="flex items-end gap-5 px-4 pt-3">
        <p className={`text-3xl font-semibold tabular-nums ${out ? 'text-red-700' : 'text-slate-900'}`}>
          {fmtTemp(zone.current_temp)}
        </p>
        <div className="pb-1 text-xs text-slate-500">
          <p className="flex items-center gap-1"><Droplets size={12} /> {zone.current_humidity ?? '—'}% humidity</p>
          <p>{zone.unit_count} units stored · {timeAgo(zone.last_reading_at)}</p>
        </div>
      </div>

      <div className="px-2 pt-2">
        {readings?.length ? <ZoneChart zone={zone} readings={readings} /> : <div className="h-40" />}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3">
        <span className="mr-auto text-xs text-slate-500">
          {zone.fault_mode === 'NONE' ? 'Simulation: normal' : (
            <Badge tone="amber">Simulated fault: {zone.fault_mode === 'HIGH' ? 'warming' : 'cooling'}</Badge>
          )}
        </span>
        {zone.fault_mode === 'NONE' ? (
          <>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => onFault(zone.id, 'HIGH')}>
              <Flame size={13} /> Warm up
            </Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => onFault(zone.id, 'LOW')}>
              <Snowflake size={13} /> Cool down
            </Button>
          </>
        ) : (
          <Button size="sm" variant="info" disabled={busy} onClick={() => onFault(zone.id, 'NONE')}>
            <RotateCcw size={13} /> Restore normal
          </Button>
        )}
      </div>
    </div>
  )
}

export default function StorageMonitoring() {
  const facilities = usePolling(api.facilities, 5000)
  const readings = usePolling(() => api.readings(60), 5000)
  const [selected, setSelected] = useState('all')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)

  async function run(action) {
    setBusy(true)
    setActionError(null)
    try {
      await action()
      await Promise.all([facilities.refresh(), readings.refresh()])
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (facilities.loading && !facilities.data) return <Loading />
  const list = (facilities.data || []).filter((f) => selected === 'all' || f.id === Number(selected))

  return (
    <>
      <PageHeader
        title="Storage monitoring"
        subtitle="Simulated temperature and humidity sensors, one reading per zone every 5 seconds. Shaded band = allowed range."
        actions={
          <Button variant="secondary" disabled={busy} onClick={() => run(() => api.tick(1))}
            title="Generate the next reading immediately instead of waiting 5 seconds">
            <FastForward size={15} /> Advance simulation
          </Button>
        }
      />
      <ErrorBanner message={facilities.error || readings.error || actionError} />

      <div className="mb-5 flex flex-wrap gap-2">
        {[{ id: 'all', name: 'All facilities' }, ...(facilities.data || [])].map((f) => (
          <button key={f.id} onClick={() => setSelected(String(f.id))}
            className={`rounded-full px-3.5 py-1.5 text-sm ${String(f.id) === selected
              ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
            {f.name}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-start gap-2 rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-900 ring-1 ring-sky-200">
        <Thermometer size={16} className="mt-0.5 shrink-0" />
        <span>
          <strong>Demo tip:</strong> press <em>Warm up</em> on a refrigerator. Its temperature climbs about 1 °C per reading,
          and within ~15 seconds the backend raises a <strong>critical alert</strong>. <em>Restore normal</em> brings it back,
          and the alert is marked resolved automatically.
        </span>
      </div>

      <div className="space-y-8">
        {list.map((f) => (
          <Card key={f.id} title={f.name} subtitle={f.location} bodyClass="p-4">
            <div className="grid gap-4 lg:grid-cols-3">
              {f.zones.map((z) => (
                <ZoneCard key={z.id} zone={z} readings={readings.data?.[z.id]} busy={busy}
                  onFault={(id, mode) => run(() => api.setFault(id, mode))} />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}
