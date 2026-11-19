import { Building2, Phone, Search, SearchX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge, BloodGroup, Button, Card, EmptyState, ErrorBanner, PageHeader, Select } from '../components/ui'
import { api, errorMessage } from '../services/api'
import { expiryLabel, fmtDate } from '../utils/format'

const GROUPS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
const COMPONENTS = [
  { code: 'RBC', name: 'Packed Red Cells' }, { code: 'WB', name: 'Whole Blood' },
  { code: 'PLT', name: 'Platelets' }, { code: 'FFP', name: 'Fresh Frozen Plasma' },
]

function FacilityResult({ f, rank, recipient, onReserve }) {
  const [showAll, setShowAll] = useState(false)
  const units = showAll ? f.units : f.units.slice(0, 4)
  return (
    <Card bodyClass="p-0" className={rank === 0 ? 'ring-2 ring-emerald-200' : ''}>
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="flex min-w-0 gap-3">
          <span className="rounded-lg bg-slate-100 p-2 text-slate-600"><Building2 size={18} /></span>
          <div>
            <p className="font-semibold text-slate-900">{f.facility_name}
              {rank === 0 && <Badge tone="green" className="ml-2 align-middle">Most stock</Badge>}</p>
            <p className="text-xs text-slate-500">{f.location}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Phone size={11} /> {f.contact}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-3xl font-semibold tabular-nums text-slate-900">{f.total_units}</p>
          <p className="text-xs text-slate-500">units</p>
          <p className="text-xs text-slate-500">earliest expiry {fmtDate(f.earliest_expiry)}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-3">
        {Object.entries(f.by_group).map(([g, n]) => (
          <span key={g} className="flex items-center gap-1.5 text-sm">
            <BloodGroup group={g} /> <span className="tabular-nums text-slate-700">× {n}</span>
            {g !== recipient && <span className="text-xs text-slate-400">(compatible)</span>}
          </span>
        ))}
      </div>
      <table className="w-full border-t border-slate-100 text-sm">
        <tbody>
          {units.map((u) => (
            <tr key={u.id} className="border-b border-slate-50 last:border-0">
              <td className="px-5 py-2 font-mono text-xs text-slate-600">{u.unit_code}</td>
              <td className="px-2 py-2"><BloodGroup group={u.blood_group} /></td>
              <td className="px-2 py-2 text-slate-600">{u.volume_ml} ml</td>
              <td className={`px-2 py-2 text-xs ${u.days_to_expiry <= 3 ? 'font-medium text-amber-700' : 'text-slate-500'}`}>
                {expiryLabel(u.days_to_expiry)}
              </td>
              <td className="px-5 py-2 text-right">
                <Button size="sm" variant="secondary" onClick={() => onReserve(u)}>Reserve</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {f.units.length > 4 && (
        <button onClick={() => setShowAll((s) => !s)} className="w-full border-t border-slate-100 py-2 text-xs font-medium text-red-700 hover:bg-slate-50 rounded-b-xl">
          {showAll ? 'Show fewer' : `Show all ${f.units.length} units`}
        </button>
      )}
    </Card>
  )
}

export default function Availability() {
  const [group, setGroup] = useState('A+')
  const [component, setComponent] = useState('RBC')
  const [compatible, setCompatible] = useState(true)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [searching, setSearching] = useState(false)

  async function search() {
    setSearching(true)
    setError(null)
    try {
      setResult(await api.availability({ blood_group: group, component, include_compatible: compatible }))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSearching(false)
    }
  }

  // search once on first load so the page is never empty
  useEffect(() => { search() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function reserve(u) {
    try {
      await api.setUnitStatus(u.id, 'RESERVED')
      setNotice(`Reserved ${u.unit_code} (${u.blood_group}) at ${u.facility_name}.`)
      search()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <>
      <PageHeader title="Availability search"
        subtitle="Find available units for a patient across every facility in the network." />

      <Card className="mb-6">
        <p className="mb-2 text-xs font-medium text-slate-600">Patient blood group</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {GROUPS.map((g) => (
            <button key={g} onClick={() => setGroup(g)}
              className={`h-11 w-14 rounded-lg text-sm font-bold transition-colors ${g === group
                ? 'bg-red-700 text-white shadow' : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-red-50'}`}>
              {g}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <Select label="Component needed" value={component} onChange={(e) => setComponent(e.target.value)} className="w-56">
            {COMPONENTS.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </Select>
          <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
            <input type="checkbox" checked={compatible} onChange={(e) => setCompatible(e.target.checked)}
              className="h-4 w-4 accent-red-700" />
            Include compatible donor groups
          </label>
          <Button onClick={search} disabled={searching} className="ml-auto">
            <Search size={15} /> {searching ? 'Searching…' : 'Search network'}
          </Button>
        </div>
      </Card>

      {notice && <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 ring-1 ring-emerald-200">{notice}</div>}
      <ErrorBanner message={error} />

      {result && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>
              <strong className="text-slate-900">{result.total_units}</strong> {result.component_name} unit{result.total_units !== 1 && 's'} for
              a <strong className="text-slate-900">{result.recipient_group}</strong> patient across{' '}
              <strong className="text-slate-900">{result.facilities.length}</strong> facilit{result.facilities.length === 1 ? 'y' : 'ies'}.
            </span>
            <span className="text-slate-400">Donor groups searched:</span>
            {result.donor_groups_searched.map((g) => <Badge key={g} tone={g === result.recipient_group ? 'red' : 'slate'}>{g}</Badge>)}
          </div>
          {result.facilities.length === 0 ? (
            <Card><EmptyState icon={SearchX} title="No matching units in the network">
              {result.include_compatible ? 'Consider contacting donors or an external blood bank.' : 'Try including compatible donor groups.'}
            </EmptyState></Card>
          ) : (
            <div className="grid items-start gap-4 lg:grid-cols-2">
              {result.facilities.map((f, i) => (
                <FacilityResult key={f.facility_id} f={f} rank={i} recipient={result.recipient_group} onReserve={reserve} />
              ))}
            </div>
          )}
          <p className="mt-4 text-xs text-slate-500">
            Exact group matches are listed first, then compatible groups, each by soonest expiry. Compatibility rules are
            simplified for this prototype (ABO/Rh for red cells; ABO plasma rules for plasma and platelets) and are not a
            substitute for cross-matching.
          </p>
        </>
      )}
    </>
  )
}
