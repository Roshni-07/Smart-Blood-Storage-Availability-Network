import { ArrowRight, Bell, Building2, CheckCircle2, Droplets, ShieldAlert, Thermometer, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import AlertItem from '../components/AlertItem'
import FacilityCard from '../components/FacilityCard'
import RangeGauge from '../components/RangeGauge'
import StockChart from '../components/StockChart'
import {
  BloodGroup, Card, DataTable, EmptyState, ErrorBanner, FACILITY_LABEL, FACILITY_TONE, LoadingState, PageHeader,
  StatCard, StatusBadge,
} from '../components/ui'
import { usePolling } from '../hooks/usePolling'
import { api } from '../services/api'
import { fmtTemp, plural, ZONE_SHORT } from '../utils/format'

function NetworkState({ t }) {
  const bad = t.zones_out_of_range > 0
  const crit = t.critical_alerts > 0
  const Icon = bad || crit ? TriangleAlert : CheckCircle2
  const text = bad || crit
    ? [bad && `${t.zones_out_of_range} storage ${plural(t.zones_out_of_range, 'zone')} out of range`,
       crit && `${t.critical_alerts} critical ${plural(t.critical_alerts, 'alert')} awaiting acknowledgement`].filter(Boolean).join(' · ')
    : 'All storage zones are within range and there are no critical alerts.'
  return (
    <div className={`mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-5 py-3.5 ${bad || crit ? 'border-crit/25 bg-crit-soft' : 'border-ok/20 bg-ok-soft'}`}>
      <Icon size={18} className={bad || crit ? 'text-crit' : 'text-ok'} />
      <p className={`flex-1 text-sm font-medium ${bad || crit ? 'text-crit' : 'text-ok'}`}>{text}</p>
      <Link to={bad ? '/monitoring' : '/alerts'} className="inline-flex items-center gap-1 text-sm font-medium text-ink hover:text-crimson-700">
        {bad ? 'Open monitoring' : 'Review alerts'} <ArrowRight size={14} />
      </Link>
    </div>
  )
}

export default function Dashboard() {
  const { data, error, loading } = usePolling(api.dashboard, 5000)

  if (loading && !data) return <LoadingState />
  if (!data) return <ErrorBanner message={error} />

  const t = data.totals
  const lowGroups = data.stock_by_group.filter((g) => g.RBC < data.low_stock_threshold)
  const zonesOk = t.storage_zones - t.zones_out_of_range

  const summaryColumns = [
    { key: 'f', header: 'Facility', render: (f) => <span><span className="block font-medium text-ink">{f.name}</span><span className="block text-xs text-muted">{f.location}</span></span> },
    { key: 's', header: 'Status', render: (f) => <StatusBadge tone={FACILITY_TONE[f.status]}>{FACILITY_LABEL[f.status]}</StatusBadge> },
    { key: 'z', header: 'Zones in range', align: 'right', render: (f) => <span className="tabular-nums">{f.zones.filter((z) => z.in_range !== false).length} / {f.zones.length}</span> },
    { key: 'u', header: 'Available units', align: 'right', render: (f) => <span className="font-medium tabular-nums">{f.available_units}</span> },
    { key: 'a', header: 'Open alerts', align: 'right', render: (f) => <span className={`tabular-nums ${f.open_alerts ? 'font-medium text-crit' : 'text-muted'}`}>{f.open_alerts}</span> },
  ]

  return (
    <>
      <PageHeader title="Network overview"
        description="Live state of storage conditions, blood stock and alerts across every facility in the network." />
      <ErrorBanner message={error} />
      <NetworkState t={t} />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Facilities" value={t.facilities} icon={Building2} tone="navy"
          hint={`${t.storage_zones} storage zones monitored`} />
        <StatCard label="Operational storage zones" icon={Thermometer}
          value={<>{zonesOk}<span className="text-2xl font-medium text-muted"> / {t.storage_zones}</span></>}
          tone={t.zones_out_of_range ? 'red' : 'green'}
          hint={t.zones_out_of_range ? `${t.zones_out_of_range} out of range now` : 'All within limits'}
          hintTone={t.zones_out_of_range ? 'red' : 'green'} />
        <StatCard label="Available blood units" value={t.available_units} icon={Droplets} tone="navy"
          hint={`${t.reserved_units} reserved · ${t.expiring_soon} expiring soon`} hintTone={t.expiring_soon ? 'amber' : undefined} />
        <StatCard label="Critical alerts" value={t.critical_alerts} icon={ShieldAlert}
          tone={t.critical_alerts ? 'red' : 'green'}
          hint={t.critical_alerts ? 'Awaiting acknowledgement' : `${t.unacknowledged_alerts} unacknowledged in total`}
          hintTone={t.critical_alerts ? 'red' : undefined} />
      </div>

      <h2 className="mb-3 text-sm font-semibold text-ink">Facility status</h2>
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.facilities.map((f) => <FacilityCard key={f.id} f={f} />)}
      </div>

      <div className="mb-6 grid items-start gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3" title="Blood group inventory"
          description="Available units across all facilities, stacked by component.">
          <StockChart data={data.stock_by_group} lowThreshold={data.low_stock_threshold} />
          {lowGroups.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-warn-soft px-3.5 py-2.5 text-[13px] text-warn">
              <span className="font-medium">Low red-cell stock:</span>
              {lowGroups.map((g) => <BloodGroup key={g.blood_group} group={g.blood_group} />)}
            </div>
          )}
        </Card>

        <Card className="xl:col-span-2" title="Storage temperatures"
          description="Current reading against each zone's allowed band.">
          <div className="space-y-5">
            {data.facilities.map((f) => (
              <div key={f.id}>
                <p className="mb-2 text-xs font-medium text-muted">{f.name}</p>
                <div className="divide-y divide-line rounded-lg border border-line">
                  {f.zones.map((z) => (
                    <div key={z.id} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 px-3.5 py-2.5">
                      <span className="text-[13px] text-ink">{ZONE_SHORT[z.zone_type] ?? z.name}</span>
                      <span className={`text-right text-[13px] font-semibold tabular-nums ${z.in_range === false ? 'text-crit' : 'text-ink'}`}>{fmtTemp(z.current_temp)}</span>
                      <span className="col-span-2"><RangeGauge min={z.min_temp} max={z.max_temp} value={z.current_temp} /></span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3" title="Facility operational summary" bodyClass="p-0">
          <DataTable dense columns={summaryColumns} rows={data.facilities} rowKey={(f) => f.id} className="mt-1" />
        </Card>

        <Card className="xl:col-span-2" title="Recent alerts" bodyClass="p-0"
          actions={<Link to="/alerts" className="inline-flex items-center gap-1 text-[13px] font-medium text-ink hover:text-crimson-700">View all <ArrowRight size={13} /></Link>}>
          {data.recent_alerts.length === 0 ? (
            <EmptyState icon={Bell} title="All clear">No alerts are waiting for acknowledgement.</EmptyState>
          ) : (
            <ul className="mt-1 divide-y divide-line overflow-hidden rounded-b-xl border-t border-line">
              {data.recent_alerts.map((a) => <AlertItem key={a.id} alert={a} compact />)}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
