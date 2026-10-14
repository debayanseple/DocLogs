import { useState } from 'react'
import { useData } from '../../services/repository'
import { useRole } from '../../services/role'
import { useAuth } from '../../services/auth'
import { Button } from '../../components/ui/Button'
import { Input, Select, Field } from '../../components/ui/Input'
import { ChevronDown } from 'lucide-react'
import type { OperationRecord } from '../../types'

export function OtForm({ patientId: fixedPatientId, op, onClose }: { patientId?: string; op?: OperationRecord; onClose: () => void }) {
  const { data, addOperation, updateOperation } = useData()
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
  const [showMore, setShowMore] = useState(!!op?.findings)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const isFinalised = op?.status === 'Finalised'

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.procedures?.[0]?.name?.trim()) e.procedures = 'Procedure name required'
    if (!form.operationDate) e.operationDate = 'Date required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (status: OperationRecord['status']) => {
    if (!validate()) return
    if (isFinalised && !canFinalise) return
    if (op) updateOperation(op.id, { ...form, status } as Partial<OperationRecord>)
    else
      addOperation({
        patientId: form.patientId!,
        facilityId: form.facilityId!,
        operationDate: form.operationDate!,
        preOpDiagnosis: form.preOpDiagnosis || form.procedures![0].name,
        postOpDiagnosis: form.postOpDiagnosis || form.preOpDiagnosis || form.procedures![0].name,
        procedures: form.procedures!.filter((p) => p.name.trim()),
        primarySurgeon: form.primarySurgeon!,
        status: status as OperationRecord['status'],
        createdBy: 'Surgeon',
      } as never)
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
          <Field label="Findings"><Input value={form.findings ?? ''} onChange={(e) => setForm({ ...form, findings: e.target.value })} placeholder="Optional" /></Field>
          <Field label="Post-op plan"><Input value={form.plan ?? ''} onChange={(e) => setForm({ ...form, plan: e.target.value })} placeholder="NG feed, antibiotics, suture removal…" /></Field>
        </div>
      )}

      <div className="flex justify-end gap-1.5">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        {isFinalised ? <Button type="button" onClick={() => handleSubmit('Amended')}>Save</Button> : <><Button type="button" variant="outline" onClick={() => handleSubmit('Draft')}>Draft</Button><Button type="button" onClick={() => handleSubmit(canFinalise ? 'Finalised' : 'Pending Review')}>Save</Button></>}
      </div>
    </form>
  )
}
