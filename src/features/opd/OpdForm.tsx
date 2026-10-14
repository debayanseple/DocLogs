import { useState } from 'react'
import { useData } from '../../services/repository'
import { useRole } from '../../services/role'
import { useAuth } from '../../services/auth'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea, Field } from '../../components/ui/Input'
import type { OpdVisit } from '../../types'
import { ChevronDown } from 'lucide-react'

export function OpdForm({ patientId: fixedPatientId, visit, onClose }: { patientId?: string; visit?: OpdVisit; onClose: () => void }) {
  const { data, addOpdVisit, updateOpdVisit, addAudit } = useData()
  const { role, canFinalise } = useRole()
  const { profileName, user } = useAuth()
  const defaultClinician = profileName || user?.email || (role === 'Surgeon' ? 'Dr. Arjun Sen' : 'Priya Das')
  const [form, setForm] = useState<Partial<OpdVisit>>(
    visit ?? {
      patientId: fixedPatientId ?? data.patients[0]?.id ?? '',
      facilityId: data.facilities.find((f) => f.status === 'Active')?.id ?? '',
      visitDate: new Date().toISOString().slice(0, 16),
      chiefComplaint: '',
      assessment: '',
      plan: '',
      clinician: defaultClinician,
      status: 'Draft',
    }
  )
  const [showMore, setShowMore] = useState(!!visit && !!(visit.hpi || visit.examination))
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isFinalised = visit?.status === 'Finalised'

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.chiefComplaint?.trim()) e.chiefComplaint = 'What is the main complaint?'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (status: OpdVisit['status']) => {
    if (!validate()) return
    if (isFinalised && !canFinalise) return
    const payload: Partial<OpdVisit> = { ...form, status }
    if (visit) {
      if (isFinalised && status === 'Amended') {
        updateOpdVisit(visit.id, { ...payload, updatedAt: new Date().toISOString() } as Partial<OpdVisit>)
        addAudit({ recordId: visit.id, recordType: 'OpdVisit', action: 'Amended', userId: role, userName: profileName || role, details: 'Amendment' })
      } else {
        if (status === 'Finalised' && !canFinalise) {
          alert('Only Surgeon can finalise. Saving as Pending Review.')
          payload.status = 'Pending Review'
        }
        updateOpdVisit(visit.id, { ...payload, updatedAt: new Date().toISOString() } as Partial<OpdVisit>)
      }
    } else {
      if (status === 'Finalised' && !canFinalise) payload.status = 'Pending Review'
      const rec = addOpdVisit({
        patientId: form.patientId!,
        facilityId: form.facilityId!,
        visitDate: form.visitDate!,
        visitType: (form.visitType as OpdVisit['visitType']) ?? 'New',
        chiefComplaint: form.chiefComplaint!.trim(),
        hpi: form.hpi,
        assessment: form.assessment,
        plan: form.plan,
        investigations: form.investigations,
        followUpDate: form.followUpDate,
        clinician: form.clinician!,
        status: payload.status as OpdVisit['status'],
        createdBy: role,
      })
      addAudit({ recordId: rec.id, recordType: 'OpdVisit', action: `Created — ${payload.status}`, userId: role, userName: profileName || role, details: form.chiefComplaint })
    }
    onClose()
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
      {!fixedPatientId && (
        <Field label="Patient" required>
          <Select value={form.patientId ?? ''} onChange={(e) => setForm({ ...form, patientId: e.target.value })}>
            <option value="">Select patient</option>
            {data.patients.map((p) => <option key={p.id} value={p.id}>{p.patientNumber} — {p.name}</option>)}
          </Select>
        </Field>
      )}
      {/* 3 fields only for 1-min OPD */}
      <div className="bg-teal-100/40 backdrop-blur-md border border-teal-200/50 rounded-xl p-4 space-y-3">
        <div className="text-xs font-semibold tracking-widest text-teal-700">OPD IN 60 SECONDS</div>
        <Field label="Chief complaint" required error={errors.chiefComplaint}>
          <Input value={form.chiefComplaint ?? ''} onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })} placeholder="e.g. Ulcer left tongue — 2 months" autoFocus />
        </Field>
        <Field label="Assessment / diagnosis">
          <Input value={form.assessment ?? ''} onChange={(e) => setForm({ ...form, assessment: e.target.value })} placeholder="Clinician-entered — e.g. ? SCC lateral tongue" />
        </Field>
        <Field label="Plan">
          <Input value={form.plan ?? ''} onChange={(e) => setForm({ ...form, plan: e.target.value })} placeholder="e.g. Biopsy + CECT, review 1 week" />
        </Field>
      </div>

      <button type="button" onClick={() => setShowMore(!showMore)} className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-[#162a4d] py-2 hover:bg-white/50 rounded-lg border border-dashed border-white/80">
        <ChevronDown className={`w-4 h-4 transition-transform ${showMore ? 'rotate-180' : ''}`} />
        {showMore ? 'Hide details' : 'Add exam / history / investigations (optional)'}
      </button>

      {showMore && (
        <div className="space-y-3 glass-subtle rounded-xl p-4">
          <Field label="History (HPI)"><Textarea value={form.hpi ?? ''} onChange={(e) => setForm({ ...form, hpi: e.target.value })} rows={2} placeholder="Duration, tobacco, pain…" /></Field>
          <Field label="Examination (oral + neck)"><Textarea value={form.examination ?? ''} onChange={(e) => setForm({ ...form, examination: e.target.value })} rows={2} placeholder="2.5cm ulcer, level II node 1.5cm…" /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Investigations"><Input value={form.investigations ?? ''} onChange={(e) => setForm({ ...form, investigations: e.target.value })} placeholder="CECT, biopsy" /></Field>
            <Field label="Follow-up date"><Input type="date" value={form.followUpDate ?? ''} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} /></Field>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center flex-wrap gap-1.5 pt-2">
        <span className="text-xs text-slate-400">{new Date(form.visitDate ?? '').toLocaleString()} · {form.clinician}</span>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          {isFinalised ? <Button type="button" onClick={() => handleSubmit('Amended')}>Save</Button> : <><Button type="button" variant="outline" onClick={() => handleSubmit('Draft')}>Draft</Button><Button type="button" onClick={() => handleSubmit(canFinalise ? 'Finalised' : 'Pending Review')}>{canFinalise ? 'Save & Finalise' : 'Save'}</Button></>}
        </div>
      </div>
    </form>
  )
}
