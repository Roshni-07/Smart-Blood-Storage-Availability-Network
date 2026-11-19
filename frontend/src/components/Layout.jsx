import { Bell, Droplet, FlaskConical, LayoutDashboard, Search, Thermometer } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { usePolling } from '../hooks/usePolling'
import { api } from '../services/api'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/monitoring', label: 'Storage Monitoring', icon: Thermometer },
  { to: '/inventory', label: 'Inventory', icon: FlaskConical },
  { to: '/availability', label: 'Availability Search', icon: Search },
  { to: '/alerts', label: 'Alerts', icon: Bell, badge: true },
]

export default function Layout() {
  // Shared poll for the alert badge in the sidebar
  const { data, error } = usePolling(api.dashboard, 5000)
  const unack = data?.totals.unacknowledged_alerts ?? 0
  const critical = data?.totals.critical_alerts ?? 0

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-5">
          <span className="rounded-lg bg-red-700 p-2 text-white"><Droplet size={18} fill="currentColor" /></span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-900">Smart Blood Network</p>
            <p className="text-xs text-slate-500">Storage &amp; availability</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ to, label, icon: Icon, end, badge }) => (
            <NavLink
              key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-red-50 text-red-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              <Icon size={17} />
              <span className="flex-1">{label}</span>
              {badge && unack > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold text-white ${critical ? 'bg-red-600' : 'bg-amber-500'}`}>
                  {unack}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="m-3 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 ring-1 ring-amber-200">
          <strong>Prototype.</strong> Facilities and sensor readings are simulated. Not a certified
          blood-bank system and does not control real equipment.
        </div>
        <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          <span className={`h-2 w-2 rounded-full ${error ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`} />
          {error ? 'Backend offline' : 'Live · updates every 5 s'}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top navigation */}
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 md:hidden">
          {NAV.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${isActive ? 'bg-red-50 text-red-800' : 'text-slate-600'}`}>
              {label}
            </NavLink>
          ))}
        </nav>
        <main className="mx-auto w-full max-w-7xl flex-1 p-5 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
