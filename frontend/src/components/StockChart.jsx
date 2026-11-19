// Available units per blood group, stacked by component.
// Palette: validated categorical slots 1-4 (blue, orange, aqua, yellow).
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const COMPONENT_SERIES = [
  { key: 'RBC', name: 'Packed Red Cells', color: '#2a78d6' },
  { key: 'FFP', name: 'Fresh Frozen Plasma', color: '#eb6834' },
  { key: 'PLT', name: 'Platelets', color: '#1baf7a' },
  { key: 'WB', name: 'Whole Blood', color: '#eda100' },
]

// key of the highest non-zero segment in a row (last in stack order)
const topKey = (row) => [...COMPONENT_SERIES].reverse().find((s) => row?.[s.key] > 0)?.key

const NAMES = Object.fromEntries(COMPONENT_SERIES.map((s) => [s.name, true]))

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const total = payload.filter((p) => p.name in NAMES).reduce((s, p) => s + (p.value || 0), 0)
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-slate-900">{label} · {total} units</p>
      {[...payload].filter((p) => p.name in NAMES).reverse().map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-slate-600">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
          <span className="flex-1">{p.name}</span>
          <span className="tabular-nums font-medium text-slate-900">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

export default function StockChart({ data, lowThreshold }) {
  const [view, setView] = useState('chart')
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          {COMPONENT_SERIES.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} /> {s.name}
            </span>
          ))}
        </div>
        <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs">
          {['chart', 'table'].map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`rounded-md px-2.5 py-1 capitalize ${view === v ? 'bg-white font-medium text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === 'chart' ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 18, right: 4, left: -18, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke="#e1e0d9" />
              <XAxis dataKey="blood_group" tickLine={false} axisLine={{ stroke: '#c3c2b7' }} tick={{ fill: '#52514e', fontSize: 12, fontWeight: 600 }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#898781', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
              {COMPONENT_SERIES.map((s) => (
                <Bar key={s.key} dataKey={s.key} name={s.name} stackId="a" fill={s.color}
                  stroke="#ffffff" strokeWidth={2} isAnimationActive={false}>
                  {/* the total is drawn above whichever segment is on top of the stack */}
                  <LabelList dataKey={s.key} content={(p) => (
                    topKey(data[p.index]) === s.key ? (
                      <text x={p.x + p.width / 2} y={p.y - 6} textAnchor="middle" fill="#52514e" fontSize={11} fontWeight={600}>
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3">Group</th>
                {COMPONENT_SERIES.map((s) => <th key={s.key} className="py-2 pr-3 text-right">{s.key}</th>)}
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.blood_group} className="border-b border-slate-100">
                  <td className="py-1.5 pr-3 font-semibold">{r.blood_group}</td>
                  {COMPONENT_SERIES.map((s) => (
                    <td key={s.key} className={`py-1.5 pr-3 text-right tabular-nums ${s.key === 'RBC' && r.RBC < lowThreshold ? 'font-semibold text-red-700' : ''}`}>
                      {r[s.key]}
                    </td>
                  ))}
                  <td className="py-1.5 text-right font-semibold tabular-nums">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-slate-500">Red-cell counts in red are below the low-stock threshold ({lowThreshold}).</p>
        </div>
      )}
    </div>
  )
}
