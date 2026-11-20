import { Building2, Phone, Search, SearchX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useToast } from '../components/Toast'
import {
  Badge, BloodGroup, Button, Card, DataTable, EmptyState, ErrorBanner, PageHeader, Select, Skeleton, Switch,
} from '../components/ui'
import { api, errorMessage } from '../services/api'
import { expiryLabel, fmtDate, plural } from '../utils/format'

const GROUPS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
const COMPONENTS = [
  { code: 'RBC', name: 'Packed Red Cells' }, { code: 'WB', name: 'Whole Blood' },
  { code: 'PLT', name: 'Platelets' }, { code: 'FFP', name: 'Fresh Frozen Plasma' },
]
const expiryTone = (d) => (d <= 1 ? 'red' : d <= 3 ? 'amber' : 'grey')

function FacilityResult({ f, rank, recipient, onReserve, reservingId }) {
  const [showAll, setShowAll] = useState(false)
  const units = showAll ? f.units : f.units.slice(0, 4)
  const columns = [
    { key: 'code', header: 'Unit', render: (u) => <span className="font-mono text-xs text-ink">{u.unit_code}</span> },
    { key: 'g', header: 'Group', render: (u) => <BloodGroup group={u.blood_group} /> },
    { key: 'v', header: 'Volume', className: 'text-muted tabular-nums', render: (u) => `${u.volume_ml} ml` },
    { key: 'e', header: 'Expiry', render: (u) => <Badge tone={expiryTone(u.days_to_expiry)}>{expiryLabel(u.days_to_expiry)}</Badge> },
    { key: 'a', header: '', align: 'right', render: (u) => (
      <Button size="sm" variant="secondary" loading={reservingId === u.id} disabled={reservingId != null && reservingId !== u.id}
        onClick={() => onReserve(u)}>Reserve</Button>
    ) },
  ]
  return (
    <Card bodyClass="p-0" className={rank === 0 ? 'border-ok/40' : ''}>
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="flex min-w-0 gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-navy/[0.07] text-navy"><Building2 size={18} /></span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-ink">
              {f.facility_name} {rank === 0 && <Badge tone="green" dot>Most stock</Badge>}
            </p>
            <p className="text-xs text-muted">{f.location}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted"><Phone size={11} /> {f.contact}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-3xl font-semibold leading-none tracking-[-0.02em] tabular-nums text-ink">{f.total_units}</p>
          <p className="mt-1 text-xs text-muted">{plural(f.total_units, 'unit')} available</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-5 py-3">
        {Object.entries(f.by_group).map(([g, n]) => (
          <span key={g} className="flex items-center gap-1.5 text-sm">
            <BloodGroup group={g} /> <span className="tabular-nums text-ink">× {n}</span>
            {g !== recipient && <span className="text-xs text-muted">compatible</span>}
          </span>
        ))}
        <span className="ml-auto text-xs text-muted">Earliest expiry {fmtDate(f.earliest_expiry)}</span>
      </div>
      <div className="border-t border-line"><DataTable dense columns={columns} rows={units} rowKey={(u) => u.id} /></div>
      {f.units.length > 4 && (
        <button type="button" onClick={() => setShowAll((s) => !s)}
          className="w-full rounded-b-xl border-t border-line py-2.5 text-[13px] font-medium text-ink hover:bg-canvas">
          {showAll ? 'Show fewer' : `Show all ${f.units.length} units`}
        </button>
      )}
    </Card>
  )
}

export default function Availability() {
  const toast = useToast()
  const [group, setGroup] = useState('A+')
  const [component, setComponent] = useState('RBC')
  const [compatible, setCompatible] = useState(true)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [searching, setSearching] = useState(false)
  const [reservingId, setReservingId] = useState(null)

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
    setReservingId(u.id)
    try {
      await api.setUnitStatus(u.id, 'RESERVED')
      toast.success(`Reserved ${u.unit_code}`, `${u.blood_group} at ${u.facility_name}`)
      await search()
    } catch (err) {
      toast.error('Could not reserve unit', errorMessage(err))
    } finally {
      setReservingId(null)
    }
  }

  const maxUnits = Math.max(1, ...(result?.facilities.map((f) => f.total_units) ?? [1]))

  return (
    <>
      <PageHeader title="Availability search"
        description="Find available units for a patient across every facility in the network." />

      <Card className="mb-6" bodyClass="p-6">
        <p className="mb-2.5 text-[13px] font-medium text-ink">Patient blood group</p>
        <div className="mb-6 grid grid-cols-4 gap-2 sm:grid-cols-8">
          {GROUPS.map((g) => (
            <button key={g} type="button" onClick={() => setGroup(g)} aria-pressed={g === group}
              className={`h-12 rounded-lg text-[15px] font-semibold tabular-nums transition-colors ${g === group
                ? 'bg-navy text-white' : 'border border-line-strong bg-surface text-ink hover:bg-canvas'}`}>
              {g}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <Select label="Component needed" value={component} onChange={(e) => setComponent(e.target.value)} className="w-full sm:w-60">
            {COMPONENTS.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </Select>
          <div className="pb-1.5">
            <Switch checked={compatible} onChange={setCompatible} label="Include compatible donor groups" />
          </div>
          <Button variant="accent" icon={Search} loading={searching} onClick={search} className="sm:ml-auto">Search network</Button>
        </div>
      </Card>

      <ErrorBanner message={error} />

      {!result && searching && <div className="space-y-4"><Skeleton className="h-16 rounded-xl" /><div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-80 rounded-xl" /><Skeleton className="h-80 rounded-xl" /></div></div>}

      {result && (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
            <span>
              <strong className="font-semibold text-ink">{result.total_units}</strong> {result.component_name} {plural(result.total_units, 'unit')} for
              a <strong className="font-semibold text-ink">{result.recipient_group}</strong> patient across{' '}
              <strong className="font-semibold text-ink">{result.facilities.length}</strong> {plural(result.facilities.length, 'facility', 'facilities')}.
            </span>
            <span className="text-subtle">Donor groups searched:</span>
            <span className="flex flex-wrap gap-1.5">
              {result.donor_groups_searched.map((g) => <Badge key={g} tone={g === result.recipient_group ? 'navy' : 'grey'}>{g}</Badge>)}
            </span>
          </div>

          {result.facilities.length === 0 ? (
            <Card><EmptyState icon={SearchX} title="No matching units in the network">
              {result.include_compatible ? 'Consider contacting donors or an external blood bank.' : 'Try including compatible donor groups.'}
            </EmptyState></Card>
          ) : (
            <>
              {result.facilities.length > 1 && (
                <Card className="mb-4" title="Compare facilities" description="Units available per facility, with the earliest expiry in each.">
                  <ul className="space-y-3.5">
                    {result.facilities.map((f) => (
                      <li key={f.facility_id} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-x-4 sm:grid-cols-[14rem_1fr_9rem]">
                        <span className="truncate text-sm font-medium text-ink">{f.facility_name}</span>
                        <span className="h-2 overflow-hidden rounded-full bg-line">
                          <span className="block h-full rounded-full bg-navy transition-[width] duration-500" style={{ width: `${(f.total_units / maxUnits) * 100}%` }} />
                        </span>
                        <span className="text-right text-xs text-muted"><span className="text-sm font-semibold tabular-nums text-ink">{f.total_units}</span> · exp {fmtDate(f.earliest_expiry)}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
              <div className="grid items-start gap-4 xl:grid-cols-2">
                {result.facilities.map((f, i) => (
                  <FacilityResult key={f.facility_id} f={f} rank={i} recipient={result.recipient_group}
                    onReserve={reserve} reservingId={reservingId} />
                ))}
              </div>
            </>
          )}
          <p className="mt-5 max-w-3xl text-xs leading-5 text-muted">
            Availability only — this is not transfusion authorization. Exact group matches are listed first, then compatible groups, each by soonest expiry.
            Compatibility rules are simplified for this prototype (ABO/Rh for red cells; ABO plasma rules for plasma and platelets) and are not a
            substitute for cross-matching.
          </p>
        </>
      )}
    </>
  )
}
