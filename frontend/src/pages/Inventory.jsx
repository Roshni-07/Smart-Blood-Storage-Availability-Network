import { ArrowRightLeft, FlaskConical, Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  Badge, BloodGroup, Button, Card, EmptyState, ErrorBanner, Input, Loading, PageHeader, Select, UNIT_STATUS_TONE,
} from '../components/ui'
import { usePolling } from '../hooks/usePolling'
import { api, errorMessage } from '../services/api'
import { expiryLabel, fmtDate } from '../utils/format'

const ACTION_LABEL = { AVAILABLE: 'Release', RESERVED: 'Reserve', ISSUED: 'Issue', DISCARDED: 'Discard' }
const today = () => new Date().toISOString().slice(0, 10)

function RegisterForm({ meta, facilities, onDone, onCancel }) {
  const [form, setForm] = useState({
    blood_group: 'O+', component: 'RBC', volume_ml: 300, collected_on: today(),
    expires_on: '', facility_id: facilities[0]?.id ?? '', unit_code: '',
  })
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const shelf = meta.components.find((c) => c.code === form.component)?.shelf_life_days

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
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
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card title="Register a blood unit" className="mb-6"
      subtitle="The unit is placed in the matching storage zone of the chosen facility automatically."
      actions={<button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>}>
      <ErrorBanner message={error} />
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Select label="Blood group" value={form.blood_group} onChange={set('blood_group')}>
          {meta.blood_groups.map((g) => <option key={g}>{g}</option>)}
        </Select>
        <Select label="Component" value={form.component} onChange={set('component')}>
          {meta.components.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </Select>
        <Input label="Volume (ml)" type="number" min="1" max="600" required value={form.volume_ml} onChange={set('volume_ml')} />
        <Select label="Facility" value={form.facility_id} onChange={set('facility_id')}>
          {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </Select>
        <Input label="Collection date" type="date" max={today()} required value={form.collected_on} onChange={set('collected_on')} />
        <Input label={`Expiry date (blank = +${shelf} days)`} type="date" value={form.expires_on} onChange={set('expires_on')} />
        <Input label="Unit code (blank = auto)" placeholder="e.g. CBC-261119-0200" value={form.unit_code} onChange={set('unit_code')} />
        <div className="flex items-end gap-2">
          <Button type="submit" disabled={saving} className="flex-1"><Plus size={15} /> {saving ? 'Saving…' : 'Register unit'}</Button>
        </div>
      </form>
    </Card>
  )
}

function TransferMenu({ unit, facilities, onTransfer }) {
  const [open, setOpen] = useState(false)
  if (!['AVAILABLE', 'RESERVED'].includes(unit.status)) return null
  return (
    <span className="relative">
      <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)} title="Transfer to another facility">
        <ArrowRightLeft size={13} />
      </Button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          <p className="px-2 py-1 text-xs text-slate-500">Transfer to…</p>
          {facilities.filter((f) => f.id !== unit.facility_id).map((f) => (
            <button key={f.id} onClick={() => { setOpen(false); onTransfer(unit.id, f.id) }}
              className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-100">{f.name}</button>
          ))}
        </div>
      )}
    </span>
  )
}

export default function Inventory() {
  const [meta, setMeta] = useState(null)
  const [facilities, setFacilities] = useState([])
  const [filters, setFilters] = useState({ facility_id: '', blood_group: '', component: '', status: 'AVAILABLE', search: '' })
  const [showForm, setShowForm] = useState(false)
  const [notice, setNotice] = useState(null)
  const [actionError, setActionError] = useState(null)

  useEffect(() => {
    api.meta().then(setMeta).catch((e) => setActionError(errorMessage(e)))
    api.facilities().then(setFacilities).catch(() => {})
  }, [])

  const { data: units, error, loading, refresh } = usePolling(
    () => api.inventory(filters), 10000, [JSON.stringify(filters)],
  )
  const setFilter = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }))

  async function act(fn, msg) {
    setActionError(null)
    try {
      const u = await fn()
      setNotice(msg(u))
      refresh()
    } catch (err) {
      setActionError(errorMessage(err))
    }
  }

  if (!meta) return <Loading />

  return (
    <>
      <PageHeader
        title="Blood inventory"
        subtitle="Every registered unit across the network, sorted by expiry date (first-expiry-first-out)."
        actions={!showForm && <Button onClick={() => setShowForm(true)}><Plus size={15} /> Register unit</Button>}
      />

      {showForm && (
        <RegisterForm meta={meta} facilities={facilities} onCancel={() => setShowForm(false)}
          onDone={(u) => { setShowForm(false); setNotice(`Registered ${u.unit_code} (${u.blood_group} ${u.component_name}) at ${u.facility_name}.`); refresh() }} />
      )}

      {notice && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 ring-1 ring-emerald-200">
          {notice}<button onClick={() => setNotice(null)}><X size={15} /></button>
        </div>
      )}
      <ErrorBanner message={error || actionError} />

      <Card bodyClass="p-0">
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-3 lg:grid-cols-5">
          <Select label="Facility" value={filters.facility_id} onChange={setFilter('facility_id')}>
            <option value="">All facilities</option>
            {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
          <Select label="Blood group" value={filters.blood_group} onChange={setFilter('blood_group')}>
            <option value="">All groups</option>
            {meta.blood_groups.map((g) => <option key={g}>{g}</option>)}
          </Select>
          <Select label="Component" value={filters.component} onChange={setFilter('component')}>
            <option value="">All components</option>
            {meta.components.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </Select>
          <Select label="Status" value={filters.status} onChange={setFilter('status')}>
            <option value="">All statuses</option>
            {meta.statuses.map((s) => <option key={s}>{s}</option>)}
          </Select>
          <Input label="Unit code" placeholder="Search…" value={filters.search} onChange={setFilter('search')} />
        </div>

        {loading && !units ? <Loading /> : !units?.length ? (
          <EmptyState icon={FlaskConical} title="No units match these filters" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">Unit</th>
                  <th className="px-4 py-2.5">Group</th>
                  <th className="px-4 py-2.5">Component</th>
                  <th className="px-4 py-2.5">Location</th>
                  <th className="px-4 py-2.5">Collected</th>
                  <th className="px-4 py-2.5">Expires</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {units.map((u) => {
                  const live = ['AVAILABLE', 'RESERVED'].includes(u.status)
                  const expTone = !live ? 'text-slate-400' : u.days_to_expiry <= 1 ? 'text-red-700 font-medium'
                    : u.days_to_expiry <= 3 ? 'text-amber-700 font-medium' : 'text-slate-500'
                  return (
                    <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-700">{u.unit_code}</td>
                      <td className="px-4 py-2.5"><BloodGroup group={u.blood_group} /></td>
                      <td className="px-4 py-2.5">{u.component_name}<span className="block text-xs text-slate-400">{u.volume_ml} ml</span></td>
                      <td className="px-4 py-2.5">{u.facility_name}<span className="block text-xs text-slate-400">{u.zone_name}</span></td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{fmtDate(u.collected_on)}</td>
                      <td className="whitespace-nowrap px-4 py-2.5">{fmtDate(u.expires_on)}<span className={`block text-xs ${expTone}`}>{live ? expiryLabel(u.days_to_expiry) : ''}</span></td>
                      <td className="px-4 py-2.5"><Badge tone={UNIT_STATUS_TONE[u.status]}>{u.status}</Badge></td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          {(meta.transitions[u.status] || []).map((s) => (
                            <Button key={s} size="sm" variant="secondary"
                              onClick={() => act(() => api.setUnitStatus(u.id, s), (x) => `${x.unit_code} is now ${x.status}.`)}>
                              {ACTION_LABEL[s]}
                            </Button>
                          ))}
                          <TransferMenu unit={u} facilities={facilities}
                            onTransfer={(id, fid) => act(() => api.transferUnit(id, fid), (x) => `${x.unit_code} transferred to ${x.facility_name}.`)} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="px-4 py-3 text-xs text-slate-500">{units.length} unit{units.length !== 1 && 's'} shown</p>
          </div>
        )}
      </Card>
    </>
  )
}
