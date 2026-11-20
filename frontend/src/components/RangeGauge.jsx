// Shows where a live temperature sits relative to its allowed band.
export default function RangeGauge({ min, max, value }) {
  const span = max - min
  const lo = min - span * 0.75
  const hi = max + span * 0.75
  const pct = (v) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100))
  const out = value != null && (value < min || value > max)
  return (
    <div className="relative h-5" role="img" aria-label={value == null ? 'No reading' : `${value.toFixed(1)} °C, allowed ${min} to ${max} °C`}>
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-line" />
      <div className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-ok/35"
        style={{ left: `${pct(min)}%`, width: `${pct(max) - pct(min)}%` }} />
      {value != null && (
        <div className={`absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_var(--color-line-strong)] transition-[left] duration-500 ${out ? 'bg-crit' : 'bg-navy'}`}
          style={{ left: `${pct(value)}%` }} />
      )}
    </div>
  )
}
