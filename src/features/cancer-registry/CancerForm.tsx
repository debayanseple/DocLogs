import { useState } from 'react'
import { useData } from '../../services/repository'
import { useRole } from '../../services/role'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea, Field } from '../../components/ui/Input'
import { ChevronDown } from 'lucide-react'
import type { CancerEpisode } from '../../types'

export function CancerForm({ patientId: fixedPatientId, episode, onClose }: { patientId?: string; episode?: CancerEpisode; onClose: () => void }) {
  const { data, addCancerEpisode, updateCancerEpisode, addAudit } = useData()
  const { role, canFinalise } = useRole()
  const [form, setForm] = useState<Partial<CancerEpisode>>(
    episode ?? {
      patientId: fixedPatientId ?? data.patients[0]?.id ?? '',
      primarySite: '',
      laterality: 'Unknown',
      diagnosisDate: new Date().toISOString().split('T')[0],
      stageType: 'Clinical',
      status: 'Draft',
    }
  )
  const [showStaging, setShowStaging] = useState(!!episode?.tCategory)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const isFinalised = episode?.status === 'Finalised'

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.primarySite?.trim()) e.primarySite = 'Site required'
    if (!form.diagnosisDate) e.diagnosisDate = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (status: CancerEpisode['status']) => {
    if (!validate()) return
    if (status === 'Finalised' && !canFinalise) { alert('Only Surgeon can finalise'); return }
    const payload = { ...form, status }
    if (episode) {
      updateCancerEpisode(episode.id, payload as Partial<CancerEpisode>)
    } else {
      const rec = addCancerEpisode({
        patientId: form.patientId!,
        primarySite: form.primarySite!.trim(),
        laterality: (form.laterality as CancerEpisode['laterality']) ?? 'Unknown',
        diagnosisDate: form.diagnosisDate!,
        histology: form.histology,
        status: status as CancerEpisode['status'],
        facilityId: form.facilityId,
        createdBy: role,
        tCategory: form.tCategory,
        nCategory: form.nCategory,
        mCategory: form.mCategory,
        stageGroup: form.stageGroup,
        stagingSystem: form.stagingSystem || 'AJCC',
        stagingEdition: form.stagingEdition || '8th',
        stageType: (form.stageType as CancerEpisode['stageType']) ?? 'Clinical',
      } as never)
      addAudit({ recordId: rec.id, recordType: 'CancerEpisode', action: `Created — ${status}`, userId: role, userName: role, details: form.primarySite })
    }
    onClose()
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
      {!fixedPatientId && (
        <Field label="Patient" required error={errors.patientId}>
          <Select value={form.patientId ?? ''} onChange={(e) => setForm({ ...form, patientId: e.target.value })}>
            <option value="">Select patient</option>
            {data.patients.map((p) => <option key={p.id} value={p.id}>{p.patientNumber} — {p.name}</option>)}
          </Select>
        </Field>
      )}
      <div className="bg-blue-100/40 backdrop-blur-md border border-blue-200/50 rounded-xl p-4 space-y-3">
        <div className="text-xs font-semibold tracking-widest text-blue-700">CANCER IN 30 SECONDS</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Primary site" required error={errors.primarySite}>
            <Select value={form.primarySite ?? ''} onChange={(e) => setForm({ ...form, primarySite: e.target.value })}>
              <option value="">Select site</option>
              {['Tongue','Buccal mucosa','Gingiva','Floor of mouth','Palate','Larynx','Lip','Other'].map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Diagnosis date" required error={errors.diagnosisDate}>
            <Input type="date" value={form.diagnosisDate ?? ''} onChange={(e) => setForm({ ...form, diagnosisDate: e.target.value })} />
          </Field>
        </div>
        <Field label="Histology (if known)"><Input value={form.histology ?? ''} onChange={(e) => setForm({ ...form, histology: e.target.value })} placeholder="e.g. SCC well-diff — or leave blank" /></Field>
      </div>

      <button type="button" onClick={() => setShowStaging(!showStaging)} className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-[#162a4d] py-2 hover:bg-white/50 rounded-lg border border-dashed border-white/80">
        <ChevronDown className={`w-4 h-4 transition-transform ${showStaging ? 'rotate-180' : ''}`} />
        {showStaging ? 'Hide staging (TNM)' : 'Add staging — TNM / MDT (optional)'}
      </button>

      {showStaging && (
        <div className="space-y-3 glass-subtle rounded-xl p-4">
          <div className="text-xs text-slate-500">Clinician-entered only — never auto-calculated. Leave blank if unknown.</div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="T"><Input value={form.tCategory ?? ''} onChange={(e) => setForm({ ...form, tCategory: e.target.value })} placeholder="cT2" /></Field>
            <Field label="N"><Input value={form.nCategory ?? ''} onChange={(e) => setForm({ ...form, nCategory: e.target.value })} placeholder="cN1" /></Field>
            <Field label="M"><Input value={form.mCategory ?? ''} onChange={(e) => setForm({ ...form, mCategory: e.target.value })} placeholder="cM0" /></Field>
          </div>
          <Field label="Stage group"><Input value={form.stageGroup ?? ''} onChange={(e) => setForm({ ...form, stageGroup: e.target.value })} placeholder="Stage III — optional" /></Field>
          <Field label="Notes"><Textarea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="MDT, treatment plan…" /></Field>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-1.5">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        {isFinalised ? <Button type="button" onClick={() => handleSubmit('Amended')}>Save</Button> : <><Button type="button" variant="outline" onClick={() => handleSubmit('Draft')}>Draft</Button><Button type="button" onClick={() => handleSubmit(canFinalise ? 'Finalised' : 'Pending Review')}>{canFinalise ? 'Save' : 'Save for review'}</Button></>}
      </div>
    </form>
  )
}
