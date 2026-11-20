// Shared design-system primitives. Every page is composed from these,
// so spacing, radii, colours and focus states stay consistent.
import { AlertTriangle, ChevronDown, Loader2, Search, X } from 'lucide-react'

/* ------------------------------ Layout ------------------------------ */

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0 max-w-2xl">
        <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.02em] text-ink">{title}</h1>
        {description && <p className="mt-1.5 text-sm leading-6 text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-end gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ title, description, actions, children, className = '', bodyClass = 'p-5', ...rest }) {
  return (
    <section className={`min-w-0 rounded-xl border border-line bg-surface ${className}`} {...rest}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 px-5 pb-0 pt-5">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold leading-5 tracking-[-0.005em] text-ink">{title}</h2>
            {description && <p className="mt-1 text-[13px] leading-5 text-muted">{description}</p>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </header>
      )}
      <div className={title || actions ? `${bodyClass} ${bodyClass.includes('p-0') ? '' : 'pt-4'}` : bodyClass}>{children}</div>
    </section>
  )
}

/* ------------------------------ Status ------------------------------ */

const TONES = {
  green: 'bg-ok-soft text-ok',
  amber: 'bg-warn-soft text-warn',
  red: 'bg-crit-soft text-crit',
  grey: 'bg-idle-soft text-idle',
  navy: 'bg-navy/[0.07] text-navy',
}
const DOTS = { green: 'bg-ok', amber: 'bg-warn-dot', red: 'bg-crit', grey: 'bg-subtle', navy: 'bg-navy' }

export function Badge({ tone = 'grey', dot = false, children, className = '' }) {
  return (
    <span className={`inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-xs font-medium ${TONES[tone]} ${className}`}>
      {dot && <span className={`size-1.5 rounded-full ${DOTS[tone]}`} />}
      {children}
    </span>
  )
}

export const StatusBadge = (props) => <Badge dot {...props} />

export const SEVERITY_TONE = { CRITICAL: 'red', WARNING: 'amber', INFO: 'navy' }
export const FACILITY_TONE = { OK: 'green', WARNING: 'amber', CRITICAL: 'red' }
export const FACILITY_LABEL = { OK: 'Operational', WARNING: 'Attention', CRITICAL: 'Critical' }
export const UNIT_STATUS_TONE = { AVAILABLE: 'green', RESERVED: 'navy', ISSUED: 'grey', EXPIRED: 'red', DISCARDED: 'grey' }

export function BloodGroup({ group, size = 'md' }) {
  const s = size === 'lg' ? 'h-12 min-w-14 text-base' : 'h-6 min-w-9 px-1.5 text-xs'
  return (
    <span className={`inline-flex items-center justify-center rounded-md bg-navy/[0.07] font-semibold tabular-nums text-navy ${s}`}>
      {group}
    </span>
  )
}

const ICON_TONES = {
  navy: 'bg-navy/[0.07] text-navy', green: 'bg-ok-soft text-ok', amber: 'bg-warn-soft text-warn',
  red: 'bg-crit-soft text-crit', grey: 'bg-idle-soft text-idle',
}

export function IconTile({ icon: Icon, tone = 'navy', size = 18, className = '' }) {
  return (
    <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg ${ICON_TONES[tone]} ${className}`}>
      <Icon size={size} strokeWidth={1.9} />
    </span>
  )
}

export function StatCard({ label, value, hint, icon, tone = 'navy', hintTone }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        {icon && <IconTile icon={icon} tone={tone} />}
      </div>
      <p className="mt-3 text-[40px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-ink">{value}</p>
      {hint && (
        <p className={`mt-3 flex items-center gap-1.5 text-[13px] ${hintTone === 'red' ? 'text-crit' : hintTone === 'amber' ? 'text-warn' : hintTone === 'green' ? 'text-ok' : 'text-muted'}`}>
          {hintTone && <span className={`size-1.5 rounded-full ${DOTS[hintTone]}`} />}
          {hint}
        </p>
      )}
    </div>
  )
}

/* ------------------------------ Actions ------------------------------ */

const BUTTON_VARIANTS = {
  primary: 'bg-navy text-white hover:bg-navy-700',
  accent: 'bg-crimson text-white hover:bg-crimson-700',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-canvas',
  ghost: 'text-muted hover:bg-navy/[0.06] hover:text-ink',
  danger: 'border border-crit/25 bg-surface text-crit hover:bg-crit-soft',
}

export function Button({ variant = 'primary', size = 'md', loading = false, icon: Icon, className = '', children, disabled, type = 'button', ...props }) {
  const sz = size === 'sm' ? 'h-8 gap-1.5 px-2.5 text-xs' : 'h-9 gap-2 px-3.5 text-sm'
  const iconSize = size === 'sm' ? 14 : 16
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_VARIANTS[variant]} ${sz} ${className}`}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" size={iconSize} /> : Icon && <Icon size={iconSize} strokeWidth={2} />}
      {children}
    </button>
  )
}

/* ------------------------------ Feedback ------------------------------ */

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-line/80 ${className}`} />
}

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="space-y-6" role="status" aria-label={label}>
      <div className="space-y-2"><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-96 max-w-full" /></div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  )
}
export const Loading = LoadingState

export function ErrorBanner({ message, className = 'mb-5' }) {
  if (!message) return null
  return (
    <div role="alert" className={`flex items-start gap-2.5 rounded-lg border border-crit/20 bg-crit-soft px-4 py-3 text-sm text-crit ${className}`}>
      <AlertTriangle size={16} className="mt-0.5 shrink-0" /> <span>{message}</span>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {Icon && (
        <span className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-canvas text-subtle ring-1 ring-line">
          <Icon size={22} strokeWidth={1.7} />
        </span>
      )}
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm leading-6 text-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* ------------------------------ Form controls ------------------------------ */

const CONTROL = 'h-9 w-full rounded-lg border bg-surface px-3 text-sm text-ink placeholder:text-subtle transition-colors focus:border-navy focus:ring-4 focus:ring-navy/10 disabled:bg-canvas disabled:text-muted'

export function FormField({ label, hint, error, children, className = '' }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      {label && <span className="text-[13px] font-medium text-ink">{label}</span>}
      {children}
      {error ? <span className="text-xs text-crit">{error}</span> : hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  )
}

export function Select({ label, hint, error, children, className = '', ...props }) {
  return (
    <FormField label={label} hint={hint} error={error} className={className}>
      <span className="relative block">
        <select className={`${CONTROL} appearance-none pr-9 ${error ? 'border-crit' : 'border-line-strong'}`} {...props}>{children}</select>
        <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
      </span>
    </FormField>
  )
}

export function Input({ label, hint, error, className = '', ...props }) {
  return (
    <FormField label={label} hint={hint} error={error} className={className}>
      <input className={`${CONTROL} ${error ? 'border-crit' : 'border-line-strong'}`} {...props} />
    </FormField>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className = '', ...props }) {
  return (
    <div className={`relative ${className}`}>
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input
        type="search" value={value} onChange={onChange} placeholder={placeholder} aria-label={placeholder}
        className={`${CONTROL} border-line-strong pl-9 pr-8 [&::-webkit-search-cancel-button]:hidden`} {...props}
      />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => onChange({ target: { value: '' } })}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-ink">
          <X size={14} />
        </button>
      )}
    </div>
  )
}

// A compact native select used for table filters. It highlights when a filter is active.
export function FilterDropdown({ label, value, onChange, children, className = '' }) {
  return (
    <span className={`relative block ${className}`}>
      <select
        aria-label={label} value={value} onChange={onChange}
        className={`h-9 w-full appearance-none rounded-lg border pl-3 pr-8 text-sm transition-colors focus:border-navy focus:ring-4 focus:ring-navy/10 ${
          value ? 'border-navy/30 bg-navy/[0.04] font-medium text-ink' : 'border-line-strong bg-surface text-ink'}`}
      >
        {children}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" />
    </span>
  )
}

export function Segmented({ options, value, onChange, size = 'md', className = '' }) {
  return (
    <div role="tablist" className={`inline-flex max-w-full gap-0.5 overflow-x-auto rounded-lg bg-navy/[0.06] p-0.5 ${className}`}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value} role="tab" aria-selected={active} type="button" onClick={() => onChange(o.value)}
            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors ${size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px]'} ${
              active ? 'bg-surface text-ink shadow-[0_1px_2px_rgb(23_36_58/0.1)]' : 'text-muted hover:text-ink'}`}
          >
            {o.label}
            {o.count != null && <span className={`tabular-nums ${active ? 'text-muted' : 'text-subtle'}`}>{o.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function Switch({ checked, onChange, label, description }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className="flex items-center gap-3 text-left">
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-navy' : 'bg-line-strong'}`}>
        <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
    </button>
  )
}

/* ------------------------------ Data table ------------------------------ */

// columns: [{ key, header, render(row), align?: 'right', className? }]
export function DataTable({ columns, rows, rowKey, dense = false, className = '' }) {
  const pad = dense ? 'px-4 py-2.5' : 'px-4 py-3.5 first:pl-5 last:pr-5'
  return (
    <div className={`thin-scroll overflow-x-auto ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-canvas/70 text-left text-xs font-medium text-muted">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={`whitespace-nowrap ${dense ? 'px-4 py-2' : 'px-4 py-3 first:pl-5 last:pr-5'} font-medium ${c.align === 'right' ? 'text-right' : ''}`}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={rowKey(r)} className="transition-colors hover:bg-canvas/60">
              {columns.map((c) => (
                <td key={c.key} className={`${pad} whitespace-nowrap align-middle ${c.align === 'right' ? 'text-right' : ''} ${c.className || ''}`}>{c.render(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
