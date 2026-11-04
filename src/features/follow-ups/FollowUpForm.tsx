import { useState } from 'react'
import { useData } from '../../services/repository'
import { Button } from '../../components/ui/Button'
import { Input, Select, Field } from '../../components/ui/Input'
import type { FollowUp } from '../../types'

export function FollowUpForm({ patientId: fixedPatientId, followUp, onClose }: { patientId?: string; followUp?: FollowUp; onClose: () => void }) {
  const { data, addFollowUp, updateFollowUp } = useData()
  const [form, setForm] = useState<Partial<FollowUp>>(
    followUp ?? {
      patientId: fixedPatientId ?? '',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      reason: '',
      status: 'Upcoming',
    }
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const validate = () => {
    const e: Record<string, string> = {}
    const hasReason = !!form.reason?.trim()
    const hasPaymentDue = form.paymentDue !== undefined && form.paymentDue !== null
    if (!hasReason && !hasPaymentDue) e.details = 'Enter a reason or payment due amount.'
    if (hasPaymentDue && (!Number.isFinite(form.paymentDue) || form.paymentDue! < 0)) {
      e.paymentDue = 'Payment due must be zero or more.'
    }
    if (!form.dueDate) e.dueDate = 'Date required'
    setErrors(e)
    return Object.keys(e).length === 0
  }
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    const followUpData = {
      ...form,
      reason: form.reason?.trim() ?? '',
      paymentDue: form.paymentDue ?? undefined,
      updatedAt: new Date().toISOString(),
    }
    if (followUp) updateFollowUp(followUp.id, followUpData as Partial<FollowUp>)
    else addFollowUp({ ...followUpData, patientId: form.patientId!, dueDate: form.dueDate!, status: (form.status as FollowUp['status']) ?? 'Upcoming' } as never)
    onClose()
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!fixedPatientId && !followUp && (
        <Field label="Patient" required>
          <Select value={form.patientId ?? ''} onChange={(e) => setForm({ ...form, patientId: e.target.value })}>
            <option value="">Select patient</option>
            {data.patients.map((p) => <option key={p.id} value={p.id}>{p.patientNumber} — {p.name}</option>)}
          </Select>
        </Field>
      )}
      <div className="bg-amber-100/40 backdrop-blur-md border border-amber-200/50 rounded-xl p-4 space-y-3">
        <div className="text-xs font-semibold tracking-widest text-amber-700">FOLLOW-UP IN 10 SECONDS</div>
        <Field label="Reason">
          <Input value={form.reason ?? ''} onChange={(e) => { setForm({ ...form, reason: e.target.value }); setErrors({}) }} placeholder="e.g. Suture removal" autoFocus />
        </Field>
        <Field label="Payment due (₹)" error={errors.paymentDue}>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.paymentDue ?? ''}
            onChange={(e) => {
              const value = e.target.value
              setForm({ ...form, paymentDue: value === '' ? undefined : Number(value) })
              setErrors({})
            }}
            placeholder="Optional"
          />
        </Field>
        {errors.details && <p role="alert" className="text-xs text-red-600">{errors.details}</p>}
        <Field label="Due date" required error={errors.dueDate}>
          <Input type="date" value={form.dueDate ?? ''} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        </Field>
      </div>
      <div className="flex flex-wrap justify-end gap-1.5">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit">{followUp ? 'Save' : 'Create'}</Button>
      </div>
    </form>
  )
}
