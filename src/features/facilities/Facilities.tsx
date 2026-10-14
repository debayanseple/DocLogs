import { useState } from 'react'
import { useData } from '../../services/repository'
import { Card, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea, Field } from '../../components/ui/Input'
import { StatusBadge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Building2, Plus, Edit2, MapPin, Phone } from 'lucide-react'
import type { Facility } from '../../types'

export function Facilities() {
  const { data, addFacility, updateFacility } = useData()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Facility | null>(null)
  const [form, setForm] = useState<Partial<Facility>>({ name: '', facilityType: 'OPD Centre', address: '', contact: '', status: 'Active', notes: '' })

  const openAdd = () => { setForm({ name: '', facilityType: 'OPD Centre', address: '', contact: '', status: 'Active', notes: '' }); setShowAdd(true) }
  const openEdit = (f: Facility) => { setForm({ ...f }); setEditing(f) }

  const handleSave = () => {
    if (!form.name?.trim() || !form.address?.trim()) { alert('Name and address required'); return }
    if (editing) {
      updateFacility(editing.id, form as Partial<Facility>)
      setEditing(null)
    } else {
      addFacility({ name: form.name!.trim(), facilityType: form.facilityType as Facility['facilityType'], address: form.address!.trim(), contact: form.contact, status: form.status as Facility['status'], notes: form.notes })
      setShowAdd(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Facilities</h2>
          <p className="text-sm text-slate-500">OPD centres and hospitals — every encounter records its facility</p>
        </div>
        <Button onClick={openAdd}><Plus className="w-4 h-4" /> Add facility</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.facilities.map((f) => (
          <Card key={f.id} className="relative">
            <div className="flex items-start justify-between gap-2">
              <div className="w-10 h-10 rounded-xl bg-[#162a4d] flex items-center justify-center shrink-0"><Building2 className="w-5 h-5 text-white" /></div>
              <StatusBadge status={f.status} />
            </div>
            <div className="mt-3">
              <div className="font-semibold text-slate-900">{f.name}</div>
              <div className="text-xs inline-flex items-center gap-1 bg-white/60 backdrop-blur-sm border border-white/70 rounded-full px-2 py-0.5 mt-1">{f.facilityType}</div>
              <div className="text-sm text-slate-600 mt-3 flex gap-1.5"><MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" /><span>{f.address}</span></div>
              {f.contact && <div className="text-sm text-slate-600 mt-1 flex gap-1.5"><Phone className="w-4 h-4 text-slate-400 shrink-0" />{f.contact}</div>}
              {f.notes && <div className="text-xs text-slate-500 mt-3 bg-slate-50 border border-slate-100 rounded-lg p-2">{f.notes}</div>}
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => openEdit(f)}><Edit2 className="w-4 h-4" /> Edit</Button>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="How facilities work" />
        <ul className="text-sm text-slate-600 list-disc ml-5 space-y-1">
          <li>A patient has one ID across all facilities — do not duplicate patient records when they attend a different location.</li>
          <li>Every OPD visit, operation and follow-up references a facility where relevant.</li>
          <li>Inactive facilities are hidden from new record forms but remain linked to existing records.</li>
        </ul>
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add facility">
        <div className="space-y-4">
          <Field label="Facility name" required><Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Type"><Select value={form.facilityType ?? 'OPD Centre'} onChange={(e) => setForm({ ...form, facilityType: e.target.value as Facility['facilityType'] })}><option value="OPD Centre">OPD Centre</option><option value="Hospital">Hospital</option><option value="Clinic">Clinic</option></Select></Field>
            <Field label="Status"><Select value={form.status ?? 'Active'} onChange={(e) => setForm({ ...form, status: e.target.value as Facility['status'] })}><option value="Active">Active</option><option value="Inactive">Inactive</option></Select></Field>
          </div>
          <Field label="Address" required><Input value={form.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label="Contact"><Input value={form.contact ?? ''} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="+91 …" /></Field>
          <Field label="Notes"><Textarea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></Field>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button><Button onClick={handleSave}>Save facility</Button></div>
        </div>
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit facility">
        <div className="space-y-4">
          <Field label="Facility name" required><Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Type"><Select value={form.facilityType ?? 'OPD Centre'} onChange={(e) => setForm({ ...form, facilityType: e.target.value as Facility['facilityType'] })}><option value="OPD Centre">OPD Centre</option><option value="Hospital">Hospital</option><option value="Clinic">Clinic</option></Select></Field>
            <Field label="Status"><Select value={form.status ?? 'Active'} onChange={(e) => setForm({ ...form, status: e.target.value as Facility['status'] })}><option value="Active">Active</option><option value="Inactive">Inactive</option></Select></Field>
          </div>
          <Field label="Address" required><Input value={form.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label="Contact"><Input value={form.contact ?? ''} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></Field>
          <Field label="Notes"><Textarea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></Field>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={handleSave}>Save changes</Button></div>
        </div>
      </Modal>
    </div>
  )
}
