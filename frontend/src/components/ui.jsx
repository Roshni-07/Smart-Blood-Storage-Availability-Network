// Small reusable UI building blocks shared by every page.
import { AlertTriangle, Loader2 } from 'lucide-react'

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ title, subtitle, actions, children, className = '', bodyClass = 'p-5' }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  )
}

const TONES = {
  red: 'bg-red-50 text-red-700 ring-red-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
}

export function Badge({ tone = 'slate', children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]} ${className}`}>
      {children}
    </span>
  )
}

export const SEVERITY_TONE = { CRITICAL: 'red', WARNING: 'amber', INFO: 'blue' }
export const FACILITY_TONE = { OK: 'green', WARNING: 'amber', CRITICAL: 'red' }
export const UNIT_STATUS_TONE = {
  AVAILABLE: 'green', RESERVED: 'blue', ISSUED: 'slate', EXPIRED: 'red', DISCARDED: 'slate',
}

export function BloodGroup({ group, size = 'md' }) {
  const s = size === 'lg' ? 'h-11 w-11 text-sm' : 'h-7 min-w-9 px-1.5 text-xs'
  return (
    <span className={`inline-flex items-center justify-center rounded-md bg-red-700 font-bold text-white ${s}`}>
      {group}
    </span>
  )
}

export function StatCard({ label, value, hint, icon: Icon, tone = 'slate' }) {
  const iconTone = {
    slate: 'bg-slate-100 text-slate-600', red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700', green: 'bg-emerald-100 text-emerald-700', blue: 'bg-sky-100 text-sky-700',
  }[tone]
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        {Icon && <span className={`rounded-lg p-1.5 ${iconTone}`}><Icon size={16} /></span>}
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }) {
  const v = {
    primary: 'bg-red-700 text-white hover:bg-red-800 disabled:bg-red-300',
    secondary: 'bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:text-slate-400',
    ghost: 'text-slate-600 hover:bg-slate-100',
    warn: 'bg-amber-500 text-white hover:bg-amber-600',
    info: 'bg-sky-600 text-white hover:bg-sky-700',
  }[variant]
  const s = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-sm'
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed ${v} ${s} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
      <Loader2 className="animate-spin" size={18} /> {label}
    </div>
  )
}

export function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {message}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && <Icon className="mb-3 text-slate-300" size={36} />}
      <p className="font-medium text-slate-700">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-slate-500">{children}</p>}
    </div>
  )
}

export function Select({ label, children, className = '', ...props }) {
  return (
    <label className={`flex flex-col gap-1 text-xs font-medium text-slate-600 ${className}`}>
      {label}
      <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100" {...props}>
        {children}
      </select>
    </label>
  )
}

export function Input({ label, className = '', ...props }) {
  return (
    <label className={`flex flex-col gap-1 text-xs font-medium text-slate-600 ${className}`}>
      {label}
      <input className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100" {...props} />
    </label>
  )
}
