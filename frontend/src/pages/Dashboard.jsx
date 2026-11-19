import { AlertOctagon, Bell, Building2, CalendarClock, Droplets, MapPin, Thermometer } from 'lucide-react'
import { Link } from 'react-router-dom'
import StockChart from '../components/StockChart'
import {
  Badge, BloodGroup, Card, EmptyState, ErrorBanner, FACILITY_TONE, Loading, PageHeader,
  SEVERITY_TONE, StatCard,
} from '../components/ui'
import { usePolling } from '../hooks/usePolling'
import { api } from '../services/api'
import { fmtTemp, timeAgo, ZONE_SHORT } from '../utils/format'

export default function Dashboard() {
  const { data, error, loading } = usePolling(api.dashboard, 5000)

  if (loading && !data) return <Loading />
  if (!data) return <ErrorBanner message={error} />

  const t = data.totals
  const lowGroups = data.stock_by_group.filter((g) => g.RBC < data.low_stock_threshold)

  return (
    <>
      <PageHeader
        title="Network dashboard"
        subtitle="Live overview of storage conditions, blood stock and alerts across all facilities."
      />
      <ErrorBanner message={error} />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Available units" value={t.available_units} icon={Droplets} tone="blue"
          hint={`${t.reserved_units} reserved · ${t.facilities} facilities`} />
        <StatCard label="Storage zones in range" value={`${t.storage_zones - t.zones_out_of_range}/${t.storage_zones}`}
          icon={Thermometer} tone={t.zones_out_of_range ? 'red' : 'green'}
          hint={t.zones_out_of_range ? `${t.zones_out_of_range} out of range now` : 'All within limits'} />
        <StatCard label="Expiring soon" value={t.expiring_soon} icon={CalendarClock} tone={t.expiring_soon ? 'amber' : 'slate'}
          hint="Use these units first" />
        <StatCard label="Alerts to acknowledge" value={t.unacknowledged_alerts} icon={Bell}
          tone={t.critical_alerts ? 'red' : t.unacknowledged_alerts ? 'amber' : 'green'}
          hint={t.critical_alerts ? `${t.critical_alerts} critical` : 'No critical alerts'} />
      </div>

      {/* Facilities */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        {data.facilities.map((f) => (
          <Card key={f.id} bodyClass="p-0"
            className={f.status === 'CRITICAL' ? 'ring-2 ring-red-300' : ''}>
            <div className="flex items-start justify-between gap-3 p-5 pb-4">
              <div className="flex gap-3">
                <span className="rounded-lg bg-slate-100 p-2 text-slate-600"><Building2 size={18} /></span>
                <div>
                  <p className="font-semibold leading-tight text-slate-900">{f.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><MapPin size={12} />{f.location}</p>
                </div>
              </div>
              <Badge tone={FACILITY_TONE[f.status]}>{f.status === 'OK' ? 'Normal' : f.status === 'WARNING' ? 'Attention' : 'Critical'}</Badge>
            </div>
            <div className="divide-y divide-slate-100 border-t border-slate-100">
              {f.zones.map((z) => (
                <div key={z.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                  <span className="text-slate-600">{ZONE_SHORT[z.zone_type]}</span>
                  <span className={`flex items-center gap-1.5 font-medium tabular-nums ${z.in_range === false ? 'text-red-700' : 'text-slate-800'}`}>
                    {z.in_range === false && <AlertOctagon size={14} />}
                    {fmtTemp(z.current_temp)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between border-t border-slate-100 bg-slate-50/60 px-5 py-2.5 text-xs text-slate-600 rounded-b-xl">
              <span><strong className="text-slate-900">{f.available_units}</strong> units available</span>
              <span><strong className="text-slate-900">{f.open_alerts}</strong> active alerts</span>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3" title="Available stock by blood group"
          subtitle="All facilities combined, stacked by component">
          <StockChart data={data.stock_by_group} lowThreshold={data.low_stock_threshold} />
          {lowGroups.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
              <span className="font-medium">Low red-cell stock:</span>
              {lowGroups.map((g) => <BloodGroup key={g.blood_group} group={g.blood_group} />)}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2" title="Latest unacknowledged alerts" bodyClass="p-0"
          actions={<Link to="/alerts" className="text-xs font-medium text-red-700 hover:underline">View all</Link>}>
          {data.recent_alerts.length === 0 ? (
            <EmptyState icon={Bell} title="All clear">No alerts are waiting for acknowledgement.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recent_alerts.map((a) => (
                <li key={a.id} className="px-5 py-3">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge tone={SEVERITY_TONE[a.severity]}>{a.severity}</Badge>
                    <span className="text-xs text-slate-400">{timeAgo(a.created_at)}</span>
                  </div>
                  <p className="text-sm leading-snug text-slate-700">{a.message}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
