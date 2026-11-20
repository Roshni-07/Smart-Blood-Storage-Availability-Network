import { useEffect, useRef } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fmtTemp, fmtTime } from '../utils/format'

const LINE = '#17243A'
const CRIT = '#CF2D3F'

function ReadingTooltip({ active, payload, zone }) {
  if (!active || !payload?.length) return null
  const r = payload[0].payload
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2.5 text-xs shadow-pop">
      <p className="text-muted">{fmtTime(r.recorded_at)}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-ink">{fmtTemp(r.temperature)}</p>
      <p className="text-muted">{r.humidity}% relative humidity</p>
      <p className={`mt-1 font-medium ${r.in_range ? 'text-ok' : 'text-crit'}`}>
        {r.in_range ? 'Within' : 'Outside'} allowed {zone.min_temp} to {zone.max_temp} °C
      </p>
    </div>
  )
}

function OutOfRangeDot({ cx, cy, payload }) {
  if (payload.in_range || cx == null) return null
  return <circle cx={cx} cy={cy} r={4.5} fill={CRIT} stroke="#fff" strokeWidth={2} />
}

function domainFor(zone, readings) {
  const temps = readings.map((r) => r.temperature)
  const lo = Math.min(zone.min_temp, ...temps)
  const hi = Math.max(zone.max_temp, ...temps)
  const pad = Math.max(1, (hi - lo) * 0.15)
  return [Math.floor(lo - pad), Math.ceil(hi + pad)]
}

// compact = small sparkline for zone cards; full = axes, labels, range lines
export default function TemperatureChart({ zone, readings, compact = false, height = 340 }) {
  const first = useRef(true)
  useEffect(() => { first.current = false }, [])
  const animate = first.current
  const domain = domainFor(zone, readings)

  if (compact) {
    return (
      <ResponsiveContainer width="100%" height={56}>
        <LineChart data={readings} margin={{ top: 4, right: 2, left: 2, bottom: 4 }}>
          <ReferenceArea y1={zone.min_temp} y2={zone.max_temp} fill="#15825A" fillOpacity={0.09} />
          <YAxis hide domain={domain} />
          <Line type="monotone" dataKey="temperature" stroke={LINE} strokeWidth={1.75} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  const refLabel = (value) => ({ value, position: 'insideTopRight', fill: '#758092', fontSize: 11 })
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={readings} margin={{ top: 12, right: 20, left: 4, bottom: 22 }}>
        <CartesianGrid vertical={false} stroke="#EEF0F4" />
        <ReferenceArea y1={zone.min_temp} y2={zone.max_temp} fill="#15825A" fillOpacity={0.09} />
        <ReferenceLine y={zone.max_temp} stroke="#15825A" strokeOpacity={0.55} strokeDasharray="4 4" label={refLabel(`Max ${zone.max_temp} °C`)} />
        <ReferenceLine y={zone.min_temp} stroke="#15825A" strokeOpacity={0.55} strokeDasharray="4 4" label={{ ...refLabel(`Min ${zone.min_temp} °C`), position: 'insideBottomRight' }} />
        <XAxis dataKey="recorded_at" tickFormatter={fmtTime} minTickGap={64} tickLine={false}
          axisLine={{ stroke: '#D3D9E3' }} tick={{ fill: '#758092', fontSize: 11 }}
          label={{ value: 'Reading time', position: 'insideBottom', offset: -14, fill: '#758092', fontSize: 11 }} />
        <YAxis domain={domain} tickLine={false} axisLine={false} width={56} tick={{ fill: '#758092', fontSize: 11 }}
          tickFormatter={(v) => `${v}°`}
          label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft', offset: 2, style: { textAnchor: 'middle', fill: '#758092', fontSize: 11 } }} />
        <Tooltip content={<ReadingTooltip zone={zone} />} cursor={{ stroke: '#A6AEBB', strokeWidth: 1 }} />
        <Line type="monotone" dataKey="temperature" stroke={LINE} strokeWidth={2.25} dot={<OutOfRangeDot />}
          activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2, fill: LINE }} isAnimationActive={animate} animationDuration={600} />
      </LineChart>
    </ResponsiveContainer>
  )
}
