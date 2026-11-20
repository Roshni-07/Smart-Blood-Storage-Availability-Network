// Available units per blood group, stacked by component.
import { useEffect, useRef, useState } from 'react'
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Segmented } from './ui'

export const COMPONENT_SERIES = [
  { key: 'RBC', name: 'Packed Red Cells', color: '#17243A' },
  { key: 'WB', name: 'Whole Blood', color: '#5E7FB0' },
  { key: 'PLT', name: 'Platelets', color: '#2FA39A' },
  { key: 'FFP', name: 'Fresh Frozen Plasma', color: '#B8C4D8' },
]
const topKey = (row) => [...COMPONENT_SERIES].reverse().find((s) => row?.[s.key] > 0)?.key
const NAMES = new Set(COMPONENT_SERIES.map((s) => s.name))

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const rows = payload.filter((p) => NAMES.has(p.name))
  const total = rows.reduce((s, p) => s + (p.value || 0), 0)
  return (
    <div className="min-w-44 rounded-lg border border-line bg-surface px-3 py-2.5 text-xs shadow-pop">
      <p className="mb-1.5 flex justify-between gap-4 font-semibold text-ink"><span>{label}</span><span className="tabular-nums">{total} units</span></p>
      {[...rows].reverse().map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 py-0.5 text-muted">
          <span className="size-2 rounded-sm" style={{ background: p.color }} />
          <span className="flex-1">{p.name}</span>
          <span className="font-medium tabular-nums text-ink">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

export default function StockChart({ data, lowThreshold }) {
  const [view, setView] = useState('chart')
  // animate on first paint only, so 5-second polling never makes bars flicker
  const first = useRef(true)
  useEffect(() => { first.current = false }, [])
  const animate = first.current

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
          {COMPONENT_SERIES.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: s.color }} /> {s.name}
            </span>
          ))}
        </div>
        <Segmented size="sm" value={view} onChange={setView}
          options={[{ value: 'chart', label: 'Chart' }, { value: 'table', label: 'Table' }]} />
      </div>

      {view === 'chart' ? (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 4, left: -16, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke="#EEF0F4" />
              <XAxis dataKey="blood_group" tickLine={false} axisLine={{ stroke: '#D3D9E3' }} tick={{ fill: '#17243A', fontSize: 12, fontWeight: 600 }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#758092', fontSize: 11 }}
                label={{ value: 'Available units', angle: -90, position: 'insideLeft', offset: 24, style: { textAnchor: 'middle', fill: '#758092', fontSize: 11 } }} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F5F6F8' }} />
              {COMPONENT_SERIES.map((s) => (
                <Bar key={s.key} dataKey={s.key} name={s.name} stackId="a" fill={s.color}
                  stroke="#ffffff" strokeWidth={1.5} isAnimationActive={animate} animationDuration={500}>
                  <LabelList dataKey={s.key} content={(p) => (
                    topKey(data[p.index]) === s.key ? (
                      <text x={p.x + p.width / 2} y={p.y - 7} textAnchor="middle" fill="#17243A" fontSize={11} fontWeight={600}>
                        {data[p.index].total}
                      </text>
                    ) : null
                  )} />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium text-muted">
                <th className="py-2 pr-3 font-medium">Group</th>
                {COMPONENT_SERIES.map((s) => <th key={s.key} className="py-2 pr-3 text-right font-medium">{s.key}</th>)}
                <th className="py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((r) => (
                <tr key={r.blood_group}>
                  <td className="py-2 pr-3 font-semibold">{r.blood_group}</td>
                  {COMPONENT_SERIES.map((s) => (
                    <td key={s.key} className={`py-2 pr-3 text-right tabular-nums ${s.key === 'RBC' && r.RBC < lowThreshold ? 'font-semibold text-crit' : 'text-ink'}`}>{r[s.key]}</td>
                  ))}
                  <td className="py-2 text-right font-semibold tabular-nums">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted">Red-cell counts in red are below the low-stock threshold ({lowThreshold}).</p>
        </div>
      )}
    </div>
  )
}
