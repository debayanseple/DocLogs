import { useState } from 'react'
import { useData } from '../../services/repository'
import { useRole } from '../../services/role'
import { useAuth } from '../../services/auth'
import { Button } from '../../components/ui/Button'
import { Input, Select, Field } from '../../components/ui/Input'
import { ChevronDown } from 'lucide-react'
import type { FollowUp, OperationRecord } from '../../types'

export function OtForm({ patientId: fixedPatientId, op, onClose }: { patientId?: string; op?: OperationRecord; onClose: () => void }) {
  const { data, addOperation, updateOperation, addPatient, addFollowUp } = useData()
  const { canFinalise } = useRole()
  const { profileName } = useAuth()
  const [form, setForm] = useState<Partial<OperationRecord>>(
    op ?? {
      patientId: fixedPatientId ?? data.patients[0]?.id ?? '',
      facilityId: data.facilities.find((f) => f.status === 'Active')?.id ?? '',
      operationDate: new Date().toISOString().slice(0, 16),
      preOpDiagnosis: '',
      procedures: [{ name: '' }],
      primarySurgeon: profileName || 'Dr. Arjun Sen',
      status: 'Draft',
    }
  )
  // Standalone entry (no fixed patient): doctor can log an OT for a brand-new
  // patient inline, without a separate Add Patient step first.
  const [patientMode, setPatientMode] = useState<'existing' | 'new'>(fixedPatientId ? 'existing' : 'new')
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [showMore, setShowMore] = useState(!!op?.findings)
  const [reviewDate, setReviewDate] = useState(op?.followUpDate ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const isFinalised = op?.status === 'Finalised'

  // Review date → auto follow-up, linked back to this OT
  const createReviewFollowUp = (pid: string, otId: string, procName: string) => {
    if (!reviewDate) return
    const today = new Date().toISOString().slice(0, 10)
    const status: FollowUp['status'] =
      reviewDate < today ? 'Overdue' : reviewDate === today ? 'Due' : 'Upcoming'
    addFollowUp({
      patientId: pid,
      dueDate: reviewDate,
      reason: `Post-op review — ${procName}`,
      facilityId: form.facilityId,
      assignedTo: form.primarySurgeon,
      status,
      relatedId: otId,
      relatedType: 'OT',
    })
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.procedures?.[0]?.name?.trim()) e.procedures = 'Procedure name required'
    if (!form.operationDate) e.operationDate = 'Date required'
    if (!fixedPatientId && patientMode === 'new' && !newName.trim()) e.newName = 'Patient name required'
    if (!fixedPatientId && patientMode === 'existing' && !form.patientId) e.patientId = 'Select patient'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (status: OperationRecord['status']) => {
    if (!validate()) return
    if (isFinalised && !canFinalise) return
    // Amending a finalised operation must capture why — the prior values are
    // kept, but without a reason the history is not auditable.
    let amendmentReason: string | undefined
    if (op && isFinalised && status === 'Amended') {
      const reason = window.prompt('Why is this operation being amended? The previous values will be kept in the record history.')
      if (reason === null) return
      amendmentReason = reason.trim() || 'Amendment (no reason given)'
    }
    if (op) {
      updateOperation(op.id, { ...form, status, amendmentReason, followUpDate: reviewDate || undefined } as Partial<OperationRecord>)
      // Review date added on edit → create the follow-up only if this OT
      // doesn't already have one linked, so edits never duplicate it.
      if (reviewDate && !data.followUps.some((f) => f.relatedId === op.id)) {
        createReviewFollowUp(op.patientId, op.id, op.procedures[0]?.name ?? 'Operation')
      }
    } else {
      // Inline patient: same submit creates the patient first, then the OT
      // linked to it — one tap, no separate registration step.
      let pid = form.patientId!
      if (!fixedPatientId && patientMode === 'new') {
        const np = addPatient({
          name: newName.trim(),
          phone: newPhone.trim() || undefined,
          sex: 'Not recorded',
          registrationDate: new Date().toISOString().split('T')[0],
          primaryFacilityId: form.facilityId,
          status: 'Active',
        })
        pid = np.id
      }
      const procName = form.procedures![0].name
      const rec = addOperation({
        patientId: pid,
        facilityId: form.facilityId!,
        operationDate: form.operationDate!,
        electiveEmergency: form.electiveEmergency,
        preOpDiagnosis: form.preOpDiagnosis || procName,
        postOpDiagnosis: form.postOpDiagnosis || form.preOpDiagnosis || procName,
        procedures: form.procedures!.filter((p) => p.name.trim()),
        primarySurgeon: form.primarySurgeon!,
        assistants: form.assistants ?? [],
        anaesthesiaType: form.anaesthesiaType,
        anaesthetist: form.anaesthetist,
        findings: form.findings,
        reconstruction: form.reconstruction,
        complications: form.complications,
        outcome: form.outcome,
        plan: form.plan,
        followUpDate: reviewDate || undefined,
        status: status as OperationRecord['status'],
        createdBy: 'Surgeon',
      } as never)
      createReviewFollowUp(pid, rec.id, procName)
    }
    onClose()
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
      {!fixedPatientId && !op && (
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-white/45 backdrop-blur-md border border-white/70">
          {(['new', 'existing'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setPatientMode(m)}
              className={`h-8 rounded-lg text-xs font-medium transition-colors ${
                patientMode === m ? 'bg-[#162a4d] text-white' : 'text-slate-600 hover:bg-white/60'
              }`}
            >
              {m === 'new' ? 'New patient' : 'Existing patient'}
            </button>
          ))}
        </div>
      )}
      {!fixedPatientId && patientMode === 'existing' && (
        <Field label="Patient" required error={errors.patientId}>
          <Select value={form.patientId ?? ''} onChange={(e) => setForm({ ...form, patientId: e.target.value })}>
            <option value="">Select patient</option>
            {data.patients.map((p) => <option key={p.id} value={p.id}>{p.patientNumber} — {p.name}</option>)}
          </Select>
        </Field>
      )}
      {!fixedPatientId && !op && patientMode === 'new' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Patient name" required error={errors.newName}>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Rahul Mukherjee" />
          </Field>
          <Field label="Phone (optional)">
            <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="98765 43210" inputMode="numeric" />
          </Field>
        </div>
      )}
      <div className="bg-indigo-100/40 backdrop-blur-md border border-indigo-200/50 rounded-xl p-4 space-y-3">
        <div className="text-xs font-semibold tracking-widest text-indigo-700">OT IN 30 SECONDS</div>
        <Field label="Procedure" required error={errors.procedures}>
          <Input value={form.procedures?.[0]?.name ?? ''} onChange={(e) => setForm({ ...form, procedures: [{ name: e.target.value }] })} placeholder="e.g. WLE left tongue + neck dissection" autoFocus />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Date" required error={errors.operationDate}>
            <Input type="datetime-local" value={form.operationDate ?? ''} onChange={(e) => setForm({ ...form, operationDate: e.target.value })} />
          </Field>
          <Field label="Diagnosis"><Input value={form.preOpDiagnosis ?? ''} onChange={(e) => setForm({ ...form, preOpDiagnosis: e.target.value })} placeholder="Ca tongue cT2N1" /></Field>
        </div>
      </div>

      <button type="button" onClick={() => setShowMore(!showMore)} className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-[#162a4d] py-2 hover:bg-white/50 rounded-lg border border-dashed border-white/80">
        <ChevronDown className={`w-4 h-4 transition-transform ${showMore ? 'rotate-180' : ''}`} />
        {showMore ? 'Hide details' : 'Add team / findings / plan (optional)'}
      </button>

      {showMore && (
        <div className="space-y-3 glass-subtle rounded-xl p-4">
          <Field label="Operating team" hint="Comma separated — e.g. Dr A Sen, Dr B Roy, Dr C Das">
            <Input
              value={(form.assistants ?? []).join(', ')}
              onChange={(e) =>
                setForm({
                  ...form,
                  assistants: e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
              placeholder="Surgeon assistants and nursing team"
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Anaesthesia"><Input value={form.anaesthesiaType ?? ''} onChange={(e) => setForm({ ...form, anaesthesiaType: e.target.value as OperationRecord['anaesthesiaType'] })} placeholder="General / Local / Regional" /></Field>
            <Field label="Anaesthetist"><Input value={form.anaesthetist ?? ''} onChange={(e) => setForm({ ...form, anaesthetist: e.target.value })} placeholder="Optional" /></Field>
          </div>
          <Field label="Findings"><Input value={form.findings ?? ''} onChange={(e) => setForm({ ...form, findings: e.target.value })} placeholder="Optional" /></Field>
          <Field label="Outcome"><Input value={form.outcome ?? ''} onChange={(e) => setForm({ ...form, outcome: e.target.value })} placeholder="Optional" /></Field>
          <Field label="Complications"><Input value={form.complications ?? ''} onChange={(e) => setForm({ ...form, complications: e.target.value })} placeholder="None / describe" /></Field>
          <Field label="Post-op plan"><Input value={form.plan ?? ''} onChange={(e) => setForm({ ...form, plan: e.target.value })} placeholder="NG feed, antibiotics, suture removal…" /></Field>
          <Field label="Review date" hint="Creates a follow-up automatically">
            <Input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} />
          </Field>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-1.5">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        {isFinalised ? <Button type="button" onClick={() => handleSubmit('Amended')}>Save</Button> : <><Button type="button" variant="outline" onClick={() => handleSubmit('Draft')}>Draft</Button><Button type="button" onClick={() => handleSubmit(canFinalise ? 'Finalised' : 'Pending Review')}>Save</Button></>}
      </div>
    </form>
  )
}
