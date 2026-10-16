import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useData } from '../../services/repository'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea, Field } from '../../components/ui/Input'
import { AlertTriangle, ChevronDown, Check } from 'lucide-react'
import type { Patient } from '../../types'

// Reports a patient may already carry at registration. Covers what the
// doctor asked for (CT, biopsy, pre-surgical, thyroid) plus the reports an
// OMFS / Head & Neck Oncology practice routinely needs: OPG + CBCT for bony
// pathology, CECT neck/chest + FNAC/HPE for oncology workup, and a bundled
// pre-surgical fitness workup.
export const TEST_OPTIONS = [
  'CT Scan',
  'Biopsy Report (HPE)',
  'FNAC Report',
  'OPG X-ray',
  'CBCT',
  'CECT (Neck / Chest)',
  'Thyroid Profile (T3 / T4 / TSH)',
  'Pre-Surgical Workup (CBC, RFT/LFT, ECG, viral markers)',
]

function TestsDropdown({
  value,
  onChange,
}: {
  value: string[]
  onChange: (next: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number; maxH: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Position the panel in viewport coordinates. Rendered via portal so no
  // ancestor stacking context (modal blur, form) can ever paint over it.
  const updatePos = () => {
    const el = btnRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const gap = 6
    const maxH = Math.min(224, window.innerHeight - 32)
    const below = window.innerHeight - r.bottom - gap - 8
    const flip = below < 180 && r.top > window.innerHeight - r.bottom
    setPos({
      left: Math.max(8, Math.min(r.left, window.innerWidth - r.width - 8)),
      width: Math.min(r.width, window.innerWidth - 16),
      top: flip ? Math.max(8, r.top - gap - maxH) : r.bottom + gap,
      maxH,
    })
  }

  useEffect(() => {
    if (!open) return
    updatePos()
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node
      if (btnRef.current?.contains(t)) return
      if (panelRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('touchstart', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', updatePos)
    window.addEventListener('orientationchange', updatePos)
    // capture: catches scrolling inside the modal sheet too
    document.addEventListener('scroll', updatePos, true)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('touchstart', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', updatePos)
      window.removeEventListener('orientationchange', updatePos)
      document.removeEventListener('scroll', updatePos, true)
    }
  }, [open ])

  const toggle = (opt: string) =>
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt])

  const label =
    value.length === 0
      ? 'Select reports patient already has'
      : value.length === 1
        ? value[0]
        : `${value[0]} +${value.length - 1} more`

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => (open ? setOpen(false) : setOpen(true))}
        className="w-full rounded-xl text-slate-900 bg-white/55 backdrop-blur-md border border-white/70 px-3 py-2 text-sm min-h-[44px] sm:min-h-0 text-left flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-[#162a4d]/25 focus:bg-white/75"
      >
        <span className={value.length === 0 ? 'text-slate-400' : 'truncate'}>{label}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            className="glass-strong rounded-2xl py-1.5 overflow-y-auto"
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxH,
              zIndex: 100,
            }}
          >
            {TEST_OPTIONS.map((opt) => {
              const checked = value.includes(opt)
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggle(opt)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-white/60 text-left"
                >
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      checked ? 'bg-[#162a4d] border-[#162a4d] text-white' : 'border-slate-300 bg-white/60'
                    }`}
                  >
                    {checked && <Check className="w-3 h-3" />}
                  </span>
                  {opt}
                </button>
              )
            })}
            {value.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full px-3.5 py-2 text-xs text-slate-500 hover:bg-white/60 text-left border-t border-white/60 mt-1"
              >
                Clear all
              </button>
            )}
          </div>,
          document.body,
        )}
    </>
  )
}

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
      chiefComplaint: '',
      referredBy: '',
      testsAvailable: [] as string[],
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
        chiefComplaint: form.chiefComplaint?.trim() || undefined,
        referredBy: form.referredBy?.trim() || undefined,
        testsAvailable: form.testsAvailable?.length ? form.testsAvailable : undefined,
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

      {/* Quick 1-min capture — relative + z-10 so the tests dropdown
          paints above the Cancel/Create buttons below (backdrop-blur
          creates a stacking context that would otherwise trap it) */}
      <div className="relative z-10 bg-white/55 backdrop-blur-md border border-white/70 rounded-xl p-4 space-y-3">
        <div className="text-xs font-semibold tracking-widest text-slate-500">QUICK CAPTURE — 1 min</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Full name" required error={errors.name}>
            <Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Rahul Mukherjee" autoFocus />
          </Field>
          <Field label="Phone" required error={errors.phone}>
            <Input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="98765 43210" inputMode="numeric" />
          </Field>
          <Field label="Age">
            <Input type="number" min={0} max={120} value={form.age ?? ''} onChange={(e) => setForm({ ...form, age: e.target.value ? Number(e.target.value) : undefined })} placeholder="Years" />
          </Field>
          <Field label="Facility" required error={errors.primaryFacilityId}>
            <Select value={form.primaryFacilityId ?? ''} onChange={(e) => setForm({ ...form, primaryFacilityId: e.target.value })}>
              <option value="">Select where first seen</option>
              {data.facilities.filter((f) => f.status === 'Active').map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Chief complaint (optional)">
          <Input value={form.chiefComplaint ?? ''} onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })} placeholder="e.g. Ulcer left tongue — 2 months" />
        </Field>
        <Field label="Tests done (reports patient already has)" hint="Tick all that apply — optional">
          <TestsDropdown value={form.testsAvailable ?? []} onChange={(testsAvailable) => setForm({ ...form, testsAvailable })} />
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
            <Field label="Date of birth">
              <Input type="date" value={form.dob ?? ''} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
            </Field>
          </div>
          <Field label="Allergies"><Input value={form.allergies ?? ''} onChange={(e) => setForm({ ...form, allergies: e.target.value })} placeholder="None known" /></Field>
          <Field label="Referred by (if any)">
            <Input value={form.referredBy ?? ''} onChange={(e) => setForm({ ...form, referredBy: e.target.value })} placeholder="e.g. Dr. B. Roy" />
          </Field>
          <Field label="Medical history"><Textarea value={form.medicalHistory ?? ''} onChange={(e) => setForm({ ...form, medicalHistory: e.target.value })} placeholder="HTN, diabetes…" rows={2} /></Field>
          <Field label="Notes"><Textarea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" rows={2} /></Field>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-1.5 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit">{patient ? 'Save' : 'Create — 1 tap'}</Button>
      </div>
      <p className="text-xs text-slate-400 text-center">ID {patient?.patientNumber ?? 'CL- auto'} · Can complete later from patient profile</p>
    </form>
  )
}
