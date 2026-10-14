import { useState } from 'react'
import { useData } from '../../services/repository'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea, Field } from '../../components/ui/Input'
import { AlertTriangle, ChevronDown } from 'lucide-react'
import type { Patient } from '../../types'

export function PatientForm({ patient, onClose }: { patient?: Patient; onClose: () => void }) {
  const { data, addPatient, updatePatient, findDuplicates } = useData()
  const [form, setForm] = useState<Partial<Patient>>(
    patient ?? {
      name: '',
      dob: '',
      age: undefined,
      sex: 'Not recorded',
      phone: '',
      email: '',
      address: '',
      emergencyContact: '',
      primaryFacilityId: data.facilities.find((f) => f.status === 'Active')?.id ?? '',
      status: 'Active',
      notes: '',
      allergies: '',
      medicalHistory: '',
    }
  )
  const [showMore, setShowMore] = useState(!!patient) // existing patients show details
  const [errors, setErrors] = useState<Record<string, string>>({})

  const dups = form.name ? findDuplicates(form.name, form.dob, form.phone, patient?.id) : []

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name?.trim()) e.name = 'Required'
    if (!form.phone?.trim()) e.phone = 'Phone required for follow-up'
    if (!form.primaryFacilityId) e.primaryFacilityId = 'Select facility'
    if (form.phone && form.phone.replace(/\D/g, '').length < 10) e.phone = 'Incomplete phone'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    if (patient) {
      updatePatient(patient.id, { ...form, updatedAt: new Date().toISOString() } as Partial<Patient>)
    } else {
      addPatient({
        name: form.name!.trim(),
        dob: form.dob || undefined,
        age: form.age ? Number(form.age) : undefined,
        sex: (form.sex as Patient['sex']) ?? 'Not recorded',
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        emergencyContact: form.emergencyContact || undefined,
        registrationDate: new Date().toISOString().split('T')[0],
        primaryFacilityId: form.primaryFacilityId,
        status: (form.status as Patient['status']) ?? 'Active',
        notes: form.notes || undefined,
        allergies: form.allergies || undefined,
        medicalHistory: form.medicalHistory || undefined,
      })
    }
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {dups.length > 0 && (
        <div className="bg-amber-100/50 backdrop-blur-md border border-amber-200/60 rounded-xl p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-800">
            <div className="font-medium">Possible duplicate</div>
            <ul className="list-disc ml-4 mt-1 text-xs">
              {dups.map((d) => (
                <li key={d.id}>{d.name} · {d.patientNumber}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Quick 30-sec capture */}
      <div className="bg-white/55 backdrop-blur-md border border-white/70 rounded-xl p-4 space-y-3">
        <div className="text-xs font-semibold tracking-widest text-slate-500">QUICK CAPTURE — 30 sec</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Full name" required error={errors.name}>
            <Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Rahul Mukherjee" autoFocus />
          </Field>
          <Field label="Phone" required error={errors.phone}>
            <Input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="98765 43210" inputMode="numeric" />
          </Field>
        </div>
        <Field label="Facility" required error={errors.primaryFacilityId}>
          <Select value={form.primaryFacilityId ?? ''} onChange={(e) => setForm({ ...form, primaryFacilityId: e.target.value })}>
            <option value="">Select where first seen</option>
            {data.facilities.filter((f) => f.status === 'Active').map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
        </Field>
      </div>

      <button type="button" onClick={() => setShowMore(!showMore)} className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-[#162a4d] py-2 hover:bg-white/50 rounded-lg border border-dashed border-white/80">
        <ChevronDown className={`w-4 h-4 transition-transform ${showMore ? 'rotate-180' : ''}`} />
        {showMore ? 'Hide details' : 'Add more details (optional)'}
      </button>

      {showMore && (
        <div className="space-y-4 glass-subtle rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Sex">
              <Select value={form.sex ?? 'Not recorded'} onChange={(e) => setForm({ ...form, sex: e.target.value as Patient['sex'] })}>
                <option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option><option value="Not recorded">Skip</option>
              </Select>
            </Field>
            <Field label="Age / DOB">
              <div className="flex gap-2">
                <Input type="date" value={form.dob ?? ''} onChange={(e) => setForm({ ...form, dob: e.target.value })} className="flex-1" />
                <Input type="number" min={0} max={120} value={form.age ?? ''} onChange={(e) => setForm({ ...form, age: e.target.value ? Number(e.target.value) : undefined })} placeholder="Age" className="w-20" />
              </div>
            </Field>
          </div>
          <Field label="Allergies"><Input value={form.allergies ?? ''} onChange={(e) => setForm({ ...form, allergies: e.target.value })} placeholder="None known" /></Field>
          <Field label="Medical history"><Textarea value={form.medicalHistory ?? ''} onChange={(e) => setForm({ ...form, medicalHistory: e.target.value })} placeholder="HTN, diabetes…" rows={2} /></Field>
          <Field label="Notes"><Textarea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" rows={2} /></Field>
        </div>
      )}

      <div className="flex justify-end gap-1.5 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit">{patient ? 'Save' : 'Create — 1 tap'}</Button>
      </div>
      <p className="text-xs text-slate-400 text-center">ID {patient?.patientNumber ?? 'CL- auto'} · Can complete later from patient profile</p>
    </form>
  )
}
