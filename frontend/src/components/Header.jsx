import { ChevronRight } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import BrandMark from './BrandMark'
import { NAV } from './Sidebar'

export default function Header({ error }) {
  const { pathname } = useLocation()
  const current = NAV.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to))) ?? NAV[0]

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur">
      <div className="flex h-14 items-center justify-between gap-4 px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <span className="lg:hidden"><BrandMark size={28} /></span>
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
            <span className="hidden text-muted sm:inline">Smart Blood Network</span>
            <ChevronRight size={14} className="hidden text-subtle sm:inline" />
            <span className="font-medium text-ink">{current.label}</span>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="hidden items-center gap-1.5 rounded-md bg-warn-soft px-2 py-1 font-medium text-warn md:inline-flex">
            Prototype · simulated data
          </span>
          <span className="flex items-center gap-2 text-muted">
            <span className="relative flex size-2">
              {!error && <span className="live-ping absolute inline-flex size-full rounded-full bg-ok" />}
              <span className={`relative inline-flex size-2 rounded-full ${error ? 'bg-crit' : 'bg-ok'}`} />
            </span>
            {error ? 'Backend offline' : 'Live'}
          </span>
        </div>
      </div>
      {/* Below lg the sidebar is hidden; keep navigation reachable */}
      <nav className="thin-scroll flex gap-1 overflow-x-auto border-t border-line px-4 py-2 lg:hidden" aria-label="Primary">
        {NAV.map(({ to, label, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => `whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-navy text-white' : 'text-muted hover:text-ink'}`}>
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
