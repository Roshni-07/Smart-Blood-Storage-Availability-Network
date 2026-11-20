import { ArrowRightLeft, FlaskConical, Plus, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import {
  Badge, BloodGroup, Button, Card, DataTable, EmptyState, ErrorBanner, FilterDropdown, Input, LoadingState,
  PageHeader, SearchInput, Select, Skeleton, UNIT_STATUS_TONE,
} from '../components/ui'
import { usePolling } from '../hooks/usePolling'
import { api, errorMessage } from '../services/api'
import { expiryLabel, fmtDate, plural, titleCase } from '../utils/format'

const ACTION_LABEL = { AVAILABLE: 'Release', RESERVED: 'Reserve', ISSUED: 'Issue', DISCARDED: 'Discard' }
const ACTION_PAST = { AVAILABLE: 'released', RESERVED: 'reserved', ISSUED: 'issued', DISCARDED: 'discarded' }
const today = () => new Date().toISOString().slice(0, 10)
const DEFAULT_FILTERS = { facility_id: '', blood_group: '', component: '', status: 'AVAILABLE', search: '' }

function RegisterModal({ open, meta, facilities, onClose, onDone }) {
  const blank = () => ({
    blood_group: 'O+', component: 'RBC', volume_ml: 300, collected_on: today(),
    expires_on: '', facility_id: facilities[0]?.id ?? '', unit_code: '',
  })
  const [form, setForm] = useState(blank)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const shelf = meta.components.find((c) => c.code === form.component)?.shelf_life_days

  // reset the form each time the dialog opens
  useEffect(() => { if (open) { setForm(blank()); setErrors({}); setServerError(null) } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  function validate() {
    const e = {}
    const vol = Number(form.volume_ml)
    if (!form.volume_ml || vol < 1 || vol > 600) e.volume_ml = 'Enter a volume between 1 and 600 ml.'
    if (!form.collected_on) e.collected_on = 'Collection date is required.'
    else if (form.collected_on > today()) e.collected_on = 'Collection date cannot be in the future.'
    if (!form.facility_id) e.facility_id = 'Choose a facility.'
    return e
  }

  async function submit(ev) {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    setServerError(null)
    try {
      const unit = await api.registerUnit({
        ...form,
        volume_ml: Number(form.volume_ml),
        facility_id: Number(form.facility_id),
        expires_on: form.expires_on || null,
        unit_code: form.unit_code || null,
      })
      onDone(unit)
    } catch (err) {
      setServerError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Register a blood unit"
      description="The unit is placed in the matching storage zone of the chosen facility automatically."
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="register-form" icon={Plus} loading={saving}>Register unit</Button>
      </>}>
      <ErrorBanner message={serverError} className="mb-4" />
      <form id="register-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Select label="Blood group" value={form.blood_group} onChange={set('blood_group')}>
          {meta.blood_groups.map((g) => <option key={g}>{g}</option>)}
        </Select>
        <Select label="Component" value={form.component} onChange={set('component')}>
          {meta.components.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </Select>
        <Input label="Volume (ml)" type="number" min="1" max="600" value={form.volume_ml} onChange={set('volume_ml')} error={errors.volume_ml} />
        <Select label="Facility" value={form.facility_id} onChange={set('facility_id')} error={errors.facility_id}>
          {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </Select>
        <Input label="Collection date" type="date" max={today()} value={form.collected_on} onChange={set('collected_on')} error={errors.collected_on} />
        <Input label="Expiry date" type="date" value={form.expires_on} onChange={set('expires_on')} hint={`Leave blank for collection + ${shelf} days.`} />
        <Input label="Unit code" placeholder="e.g. CBC-261119-0200" value={form.unit_code} onChange={set('unit_code')} hint="Leave blank to auto-generate." className="sm:col-span-2" />
      </form>
    </Modal>
  )
}

function TransferModal({ unit, facilities, onClose, onConfirm }) {
  const options = unit ? facilities.filter((f) => f.id !== unit.facility_id) : []
  const [dest, setDest] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { setDest(options[0]?.id ?? '') }, [unit]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Modal open={!!unit} onClose={onClose} size="sm" title="Transfer unit"
      description={unit ? `${unit.unit_code} · currently at ${unit.facility_name}` : ''}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button icon={ArrowRightLeft} loading={busy} disabled={!dest}
          onClick={async () => { setBusy(true); await onConfirm(unit.id, Number(dest)); setBusy(false) }}>Transfer</Button>
      </>}>
      <Select label="Destination facility" value={dest} onChange={(e) => setDest(e.target.value)}>
        {options.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
      </Select>
    </Modal>
  )
}

export default function Inventory() {
  const toast = useToast()
  const [meta, setMeta] = useState(null)
  const [facilities, setFacilities] = useState([])
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [showForm, setShowForm] = useState(false)
  const [transferUnit, setTransferUnit] = useState(null)
  const [busyKey, setBusyKey] = useState(null)

  useEffect(() => {
    api.meta().then(setMeta).catch((e) => toast.error('Could not load reference data', errorMessage(e)))
    api.facilities().then(setFacilities).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: units, error, loading, refresh } = usePolling(
    () => api.inventory(filters), 10000, [JSON.stringify(filters)],
  )
  const setFilter = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }))
  const filtersChanged = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS)

  async function act(key, fn, msg) {
    setBusyKey(key)
    try {
      const u = await fn()
      toast.success(msg(u))
      refresh()
      return true
    } catch (err) {
      toast.error('Action failed', errorMessage(err))
      return false
    } finally {
      setBusyKey(null)
    }
  }

  if (!meta) return <LoadingState />

  const live = (u) => ['AVAILABLE', 'RESERVED'].includes(u.status)
  const liveUnits = (units || []).filter(live)
  const summary = [
    ['Units in view', units?.length ?? 0],
    ['Total volume', `${((units || []).reduce((s, u) => s + u.volume_ml, 0) / 1000).toFixed(1)} L`],
    ['Reserved', (units || []).filter((u) => u.status === 'RESERVED').length],
    ['Expiring within 3 days', liveUnits.filter((u) => u.days_to_expiry <= 3).length],
  ]

  const columns = [
    { key: 'code', header: 'Unit', render: (u) => <span><span className="block font-mono text-xs font-medium text-ink">{u.unit_code}</span><span className="block text-xs text-muted">Collected {fmtDate(u.collected_on)}</span></span> },
    { key: 'group', header: 'Group', render: (u) => <BloodGroup group={u.blood_group} /> },
    { key: 'comp', header: 'Component', render: (u) => <span><span className="block text-ink">{u.component_name}</span><span className="block text-xs text-muted">{u.volume_ml} ml</span></span> },
    { key: 'loc', header: 'Location', render: (u) => <span className="block max-w-[8.5rem]" title={`${u.facility_name} · ${u.zone_name}`}><span className="block truncate text-ink">{u.facility_name}</span><span className="block truncate text-xs text-muted">{u.zone_name}</span></span> },
    { key: 'exp', header: 'Expires', className: 'whitespace-nowrap', render: (u) => {
      const tone = !live(u) ? 'text-subtle' : u.days_to_expiry <= 1 ? 'text-crit font-medium' : u.days_to_expiry <= 3 ? 'text-warn font-medium' : 'text-muted'
      return <span><span className="block text-ink">{fmtDate(u.expires_on)}</span><span className={`block text-xs ${tone}`}>{live(u) ? expiryLabel(u.days_to_expiry) : ''}</span></span>
    } },
    { key: 'status', header: 'Status', render: (u) => <Badge dot tone={UNIT_STATUS_TONE[u.status]}>{titleCase(u.status)}</Badge> },
    { key: 'act', header: 'Actions', align: 'right', render: (u) => (
      <div className="flex items-center justify-end gap-1.5">
        {(meta.transitions[u.status] || []).map((s) => {
          const key = `${u.id}:${s}`
          return (
            <Button key={s} size="sm" variant={s === 'DISCARDED' ? 'danger' : 'secondary'}
              loading={busyKey === key} disabled={busyKey != null && busyKey !== key}
              onClick={() => act(key, () => api.setUnitStatus(u.id, s), (x) => `${x.unit_code} ${ACTION_PAST[s] ?? `is now ${x.status}`}`)}>
              {ACTION_LABEL[s]}
            </Button>
          )
        })}
        {live(u) && (
          <Button size="sm" variant="ghost" icon={ArrowRightLeft} aria-label={`Transfer ${u.unit_code}`}
            title="Transfer to another facility" disabled={busyKey != null} onClick={() => setTransferUnit(u)} />
        )}
      </div>
    ) },
  ]

  return (
    <>
      <PageHeader title="Blood inventory"
        description="Every registered unit across the network, sorted by expiry date (first-expiry-first-out)."
        actions={<Button variant="accent" icon={Plus} onClick={() => setShowForm(true)}>Register unit</Button>} />
      <ErrorBanner message={error} />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-line bg-surface px-5 py-4">
            <p className="text-[13px] text-muted">{label}</p>
            {units
              ? <p className="mt-1 text-2xl font-semibold tabular-nums tracking-[-0.02em] text-ink">{value}</p>
              : <Skeleton className="mt-2 h-7 w-12" />}
          </div>
        ))}
      </div>

      <Card bodyClass="p-0">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-line p-4">
          <SearchInput className="w-full sm:w-64" placeholder="Search by unit code" value={filters.search} onChange={setFilter('search')} />
          <FilterDropdown label="Facility" value={filters.facility_id} onChange={setFilter('facility_id')} className="w-full sm:w-44">
            <option value="">All facilities</option>
            {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </FilterDropdown>
          <FilterDropdown label="Blood group" value={filters.blood_group} onChange={setFilter('blood_group')} className="w-[calc(50%-5px)] sm:w-32">
            <option value="">All groups</option>
            {meta.blood_groups.map((g) => <option key={g}>{g}</option>)}
          </FilterDropdown>
          <FilterDropdown label="Component" value={filters.component} onChange={setFilter('component')} className="w-[calc(50%-5px)] sm:w-44">
            <option value="">All components</option>
            {meta.components.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </FilterDropdown>
          <FilterDropdown label="Status" value={filters.status} onChange={setFilter('status')} className="w-full sm:w-36">
            <option value="">All statuses</option>
            {meta.statuses.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
          </FilterDropdown>
          {filtersChanged && (
            <Button variant="ghost" size="sm" icon={RotateCcw} onClick={() => setFilters(DEFAULT_FILTERS)}>Reset</Button>
          )}
        </div>

        {loading && !units ? (
          <div className="space-y-3 p-5">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : !units?.length ? (
          <EmptyState icon={FlaskConical} title="No units match these filters"
            action={filtersChanged && <Button variant="secondary" onClick={() => setFilters(DEFAULT_FILTERS)}>Reset filters</Button>}>
            Try a different blood group, component or status, or register a new unit.
          </EmptyState>
        ) : (
          <>
            <DataTable columns={columns} rows={units} rowKey={(u) => u.id} />
            <p className="border-t border-line px-5 py-3 text-xs text-muted">{units.length} {plural(units.length, 'unit')} shown</p>
          </>
        )}
      </Card>

      <RegisterModal open={showForm} meta={meta} facilities={facilities} onClose={() => setShowForm(false)}
        onDone={(u) => { setShowForm(false); toast.success(`Registered ${u.unit_code}`, `${u.blood_group} ${u.component_name} at ${u.facility_name}`); refresh() }} />
      <TransferModal unit={transferUnit} facilities={facilities} onClose={() => setTransferUnit(null)}
        onConfirm={async (id, fid) => {
          const ok = await act(`${id}:transfer`, () => api.transferUnit(id, fid), (x) => `${x.unit_code} transferred to ${x.facility_name}`)
          if (ok) setTransferUnit(null)
        }} />
    </>
  )
}
