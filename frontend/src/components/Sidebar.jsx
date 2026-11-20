import { Bell, FlaskConical, LayoutDashboard, Search, Thermometer } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import BrandMark from './BrandMark'

export const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/monitoring', label: 'Storage Monitoring', icon: Thermometer },
  { to: '/inventory', label: 'Blood Inventory', icon: FlaskConical },
  { to: '/availability', label: 'Availability Search', icon: Search },
  { to: '/alerts', label: 'Alerts', icon: Bell, badge: true },
]

function Row({ label, value, tone }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-white/55">{label}</span>
      <span className="flex items-center gap-1.5 font-medium text-white/90">
        {tone && <span className={`size-1.5 rounded-full ${tone}`} />}{value}
      </span>
    </div>
  )
}

export default function Sidebar({ data, error }) {
  const t = data?.totals
  const unack = t?.unacknowledged_alerts ?? 0
  const critical = t?.critical_alerts ?? 0
  const zonesOk = t ? t.storage_zones - t.zones_out_of_range : null

  return (
    <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col bg-navy lg:flex">
      <div className="flex items-center gap-3 px-6 pb-6 pt-7">
        <BrandMark />
        <div className="leading-tight">
          <p className="text-[15px] font-semibold tracking-[-0.01em] text-white">Smart Blood Network</p>
          <p className="mt-0.5 text-xs text-white/50">Storage &amp; availability</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3" aria-label="Primary">
        {NAV.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) =>
              `group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                isActive ? 'bg-white/[0.09] text-white' : 'text-white/60 hover:bg-white/[0.05] hover:text-white'}`}>
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute -left-3 top-2 h-6 w-[3px] rounded-r bg-crimson" />}
                <Icon size={18} strokeWidth={1.8} className={isActive ? 'text-white' : 'text-white/50 group-hover:text-white/80'} />
                <span className="flex-1">{label}</span>
                {badge && unack > 0 && (
                  <span className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none tabular-nums text-white ${critical ? 'bg-crimson' : 'bg-warn-dot'}`}>
                    {unack}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="m-3 space-y-2.5 rounded-xl bg-white/[0.05] p-4 ring-1 ring-inset ring-white/[0.07]">
        <p className="text-xs font-semibold text-white">System status</p>
        <Row label="Backend" value={error ? 'Offline' : 'Online'} tone={error ? 'bg-crimson' : 'bg-emerald-400'} />
        <Row label="Zones in range" value={zonesOk == null ? '—' : `${zonesOk} / ${t.storage_zones}`}
          tone={zonesOk == null ? 'bg-white/30' : t.zones_out_of_range ? 'bg-crimson' : 'bg-emerald-400'} />
        <Row label="Refresh" value="Every 5 s" />
        <p className="border-t border-white/10 pt-2.5 text-[11px] leading-4 text-white/45">
          Prototype with simulated sensors. Not a certified blood-bank system.
        </p>
      </div>
    </aside>
  )
}
