import { useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useData } from '../../services/repository'
import { Card, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { StatusBadge, Badge } from '../../components/ui/Badge'
import { formatDate, formatDateTime, calculateAge } from '../../utils/dates'
import { ArrowLeft, Stethoscope, FileText, Scissors, CalendarCheck, CalendarClock, Beaker, Phone, MapPin, Edit2, Plus } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { OpdForm } from '../opd/OpdForm'
import { CancerForm } from '../cancer-registry/CancerForm'
import { OtForm } from '../ot/OtForm'
import { FollowUpForm } from '../follow-ups/FollowUpForm'
import { PatientForm } from './PatientForm'
import type { TimelineEvent } from '../../types'
import { SkeletonPage, Skeleton, SkeletonCard } from '../../components/ui/Skeleton'

export function PatientDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, ready } = useData()
  const patient = data.patients.find((p) => p.id === id)
  const [tab, setTab] = useState<'overview' | 'opd' | 'cancer' | 'ot' | 'investigations' | 'followups' | 'documents' | 'activity'>('overview')
  const [editOpen, setEditOpen] = useState(false)
  const [addOpd, setAddOpd] = useState(false)
  const [addCancer, setAddCancer] = useState(false)
  const [addOt, setAddOt] = useState(false)
  const [addFu, setAddFu] = useState(false)

  const facilityMap = useMemo(() => new Map(data.facilities.map((f) => [f.id, f])), [data.facilities])

  const timeline: TimelineEvent[] = useMemo(() => {
    if (!patient) return []
    const ev: TimelineEvent[] = []
    for (const v of data.opdVisits.filter((x) => x.patientId === patient.id)) {
      ev.push({ id: v.id, date: v.visitDate, type: 'OPD', title: `OPD — ${v.chiefComplaint}`, description: `${v.visitType} · ${facilityMap.get(v.facilityId)?.name ?? ''} · ${v.assessment?.slice(0, 80) ?? ''}`, facilityId: v.facilityId, facilityName: facilityMap.get(v.facilityId)?.name, status: v.status, recordId: v.id, patientId: patient.id })
    }
    for (const c of data.cancerEpisodes.filter((x) => x.patientId === patient.id)) {
      ev.push({ id: c.id, date: c.diagnosisDate, type: 'Cancer', title: `Cancer — ${c.primarySite} ${c.subsite ? `· ${c.subsite}` : ''}`, description: `${c.histology ?? ''} · ${c.tCategory ?? ''}${c.nCategory ?? ''}${c.mCategory ?? ''} ${c.stageGroup ?? ''} · ${c.stageType}`, facilityId: c.facilityId, facilityName: c.facilityId ? facilityMap.get(c.facilityId ?? '')?.name : undefined, status: c.status, recordId: c.id, patientId: patient.id })
    }
    for (const o of data.operations.filter((x) => x.patientId === patient.id)) {
      ev.push({ id: o.id, date: o.operationDate, type: 'OT', title: `Operation — ${o.procedures[0]?.name ?? 'Procedure'}`, description: `${o.preOpDiagnosis} → ${o.postOpDiagnosis}`, facilityId: o.facilityId, facilityName: facilityMap.get(o.facilityId)?.name, status: o.status, recordId: o.id, patientId: patient.id })
    }
    for (const f of data.followUps.filter((x) => x.patientId === patient.id)) {
      ev.push({ id: f.id, date: f.dueDate, type: 'FollowUp', title: `Follow-up — ${f.reason}`, description: `${f.status} · ${facilityMap.get(f.facilityId ?? '')?.name ?? ''}`, facilityId: f.facilityId, facilityName: facilityMap.get(f.facilityId ?? '')?.name, status: f.status, recordId: f.id, patientId: patient.id })
    }
    for (const inv of data.investigations.filter((x) => x.patientId === patient.id)) {
      ev.push({ id: inv.id, date: inv.date, type: 'Investigation', title: `${inv.type}`, description: inv.summary.slice(0, 100), facilityId: inv.facilityId, facilityName: inv.facilityId ? facilityMap.get(inv.facilityId)?.name : undefined, status: inv.status, recordId: inv.id, patientId: patient.id })
    }
    return ev.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [patient, data.opdVisits, data.cancerEpisodes, data.operations, data.followUps, data.investigations, facilityMap])

  if (!ready) {
    return (
      <SkeletonPage>
        <div className="space-y-4">
          <Skeleton className="h-4 w-32" />
          <div className="glass rounded-2xl p-5">
            <div className="flex gap-4">
              <Skeleton className="h-14 w-14 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3 w-64" />
                <Skeleton className="h-2.5 w-40" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:flex gap-1.5 mt-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 rounded-xl" />
              ))}
            </div>
          </div>
          <div className="flex gap-1 border-b border-white/60 pb-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-lg" />
            ))}
          </div>
          <SkeletonCard />
        </div>
      </SkeletonPage>
    )
  }

  if (!patient) return <div className="p-8 text-center text-slate-500">Patient not found. <Link to="/patients" className="text-[#162a4d] underline">Back to patients</Link></div>

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'opd', label: `OPD (${data.opdVisits.filter((v) => v.patientId === patient.id).length})` },
    { key: 'cancer', label: `Cancer (${data.cancerEpisodes.filter((c) => c.patientId === patient.id).length})` },
    { key: 'ot', label: `Operations (${data.operations.filter((o) => o.patientId === patient.id).length})` },
    { key: 'investigations', label: `Investigations` },
    { key: 'followups', label: `Follow-ups (${data.followUps.filter((f) => f.patientId === patient.id).length})` },
    { key: 'documents', label: 'Documents' },
    { key: 'activity', label: 'Activity' },
  ] as const

  return (
    <div className="space-y-4">
      {/* Screen-level back control — this screen owns its own nav */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => (window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate('/patients')}
          aria-label="Go back"
          className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-slate-600 bg-white/45 backdrop-blur-md border border-white/70 hover:bg-white/70 active:bg-white/85"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-slate-500 truncate">
          All patients
        </span>
      </div>

      {/* Header — stacks on mobile */}
      <Card>
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
          <div className="flex gap-3 sm:gap-4 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#162a4d] text-white flex items-center justify-center font-bold text-base sm:text-lg shrink-0">
              {patient.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">{patient.name}</h1>
                <span className="font-mono text-[11px] bg-white/60 backdrop-blur-sm border border-white/70 px-2 py-0.5 rounded-full">{patient.patientNumber}</span>
                <StatusBadge status={patient.status} />
              </div>
              <div className="text-sm text-slate-600 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                <span>{patient.dob ? `${formatDate(patient.dob)} · ${calculateAge(patient.dob) ?? patient.age ?? '—'}y` : patient.age ? `${patient.age}y` : 'Age —'} · {patient.sex}</span>
                {patient.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {patient.phone}</span>}
                {patient.address && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {patient.address}</span>}
              </div>
              <div className="text-xs text-slate-500 mt-2">Registered {formatDate(patient.registrationDate)} · Primary: {facilityMap.get(patient.primaryFacilityId ?? '')?.name ?? '—'} · Updated {formatDateTime(patient.updatedAt)}</div>
              {patient.notes && <div className="text-sm text-slate-700 mt-2 glass-subtle rounded-lg p-2">{patient.notes}</div>}
            </div>
          </div>
          {/* Desktop: inline labelled buttons */}
          <div className="hidden sm:flex sm:flex-wrap lg:flex-nowrap gap-1.5 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Edit2 className="w-3.5 h-3.5" /> Edit</Button>
            <Button size="sm" onClick={() => setAddOpd(true)}><Plus className="w-3.5 h-3.5" /> OPD</Button>
            <Button size="sm" variant="secondary" onClick={() => setAddCancer(true)}><Plus className="w-3.5 h-3.5" /> Cancer</Button>
            <Button size="sm" variant="outline" onClick={() => setAddOt(true)}><Plus className="w-3.5 h-3.5" /> OT</Button>
            <Button size="sm" variant="outline" onClick={() => setAddFu(true)}><Plus className="w-3.5 h-3.5" /> Follow-up</Button>
          </div>

          {/* Mobile: all five in one row, icon over label */}
          <div className="grid grid-cols-5 gap-1 sm:hidden">
            {[
              { label: 'Edit', icon: Edit2, onClick: () => setEditOpen(true), tone: 'outline' },
              { label: 'OPD', icon: Stethoscope, onClick: () => setAddOpd(true), tone: 'primary' },
              { label: 'Cancer', icon: FileText, onClick: () => setAddCancer(true), tone: 'teal' },
              { label: 'OT', icon: Scissors, onClick: () => setAddOt(true), tone: 'outline' },
              { label: 'Follow-up', icon: CalendarClock, onClick: () => setAddFu(true), tone: 'outline' },
            ].map((a) => (
              <button
                key={a.label}
                onClick={a.onClick}
                className={`flex flex-col items-center justify-center gap-1 py-2 rounded-xl active:scale-95 transition-transform ${
                  a.tone === 'primary'
                    ? 'bg-[#162a4d]/90 text-white backdrop-blur-md shadow-[0_4px_12px_-6px_rgba(22,42,77,0.5)]'
                    : a.tone === 'teal'
                      ? 'bg-teal-600/85 text-white backdrop-blur-md shadow-[0_4px_12px_-6px_rgba(13,148,136,0.45)]'
                      : 'bg-white/45 backdrop-blur-md border border-white/70 text-slate-600'
                }`}
              >
                <a.icon className="w-[18px] h-[18px]" />
                <span className="text-[10px] font-medium leading-none truncate max-w-full px-0.5">
                  {a.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="border-b border-white/60 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1 min-w-max">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as typeof tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${tab === t.key ? 'border-[#162a4d] text-[#162a4d]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader title="Unified timeline" subtitle="All encounters across facilities in chronological order" />
              {timeline.length === 0 ? <div className="text-sm text-slate-500 py-8 text-center">No records yet. Add an OPD visit or operation to build the timeline.</div> : (
                <div className="relative pl-6">
                  <div className="absolute left-[11px] top-2 bottom-2 w-px bg-slate-200" />
                  <div className="space-y-4">
                    {timeline.map((ev) => (
                      <div key={`${ev.type}-${ev.id}`} className="relative flex gap-3">
                        <div className={`w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center shrink-0 z-10 ${ev.type === 'OPD' ? 'border-teal-500 text-teal-600' : ev.type === 'Cancer' ? 'border-blue-500 text-blue-600' : ev.type === 'OT' ? 'border-indigo-500 text-indigo-600' : ev.type === 'FollowUp' ? 'border-amber-500 text-amber-600' : 'border-slate-300 text-slate-500'}`}>
                          {ev.type === 'OPD' ? <Stethoscope className="w-3 h-3" /> : ev.type === 'OT' ? <Scissors className="w-3 h-3" /> : ev.type === 'Cancer' ? <FileText className="w-3 h-3" /> : ev.type === 'FollowUp' ? <CalendarCheck className="w-3 h-3" /> : <Beaker className="w-3 h-3" />}
                        </div>
                        <div className="flex-1 min-w-0 bg-slate-50 rounded-xl border border-slate-100 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-medium text-slate-900 truncate">{ev.title}</div>
                            <span className="text-xs text-slate-500 shrink-0">{formatDate(ev.date)}</span>
                          </div>
                          <div className="text-xs text-slate-600 mt-1 line-clamp-2">{ev.description}</div>
                          <div className="flex items-center gap-2 mt-2">
                            {ev.facilityName && <Badge variant="neutral">{ev.facilityName}</Badge>}
                            <StatusBadge status={ev.status} />
                            <span className="text-xs text-slate-400">{ev.type}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
          <div className="space-y-4">
            <Card>
              <CardHeader title="At a glance" />
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">OPD visits</span><span className="font-medium">{data.opdVisits.filter((v) => v.patientId === patient.id).length}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Cancer episodes</span><span className="font-medium">{data.cancerEpisodes.filter((c) => c.patientId === patient.id).length}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Operations</span><span className="font-medium">{data.operations.filter((o) => o.patientId === patient.id).length}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Follow-ups</span><span className="font-medium">{data.followUps.filter((f) => f.patientId === patient.id).length}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Investigations</span><span className="font-medium">{data.investigations.filter((i) => i.patientId === patient.id).length}</span></div>
              </div>
            </Card>
            <Card>
              <CardHeader title="Contact & alerts" />
              <div className="space-y-2 text-sm">
                <div><span className="text-slate-500">Phone:</span> <span className="font-mono">{patient.phone ?? '—'}</span></div>
                <div><span className="text-slate-500">Allergies:</span> <span className={patient.allergies?.toLowerCase().includes('penicillin') ? 'text-red-600 font-medium' : ''}>{patient.allergies ?? '—'}</span></div>
                <div><span className="text-slate-500">Emergency:</span> {patient.emergencyContact ?? '—'}</div>
                <div><span className="text-slate-500">Medical history:</span> {patient.medicalHistory ?? '—'}</div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'opd' && (
        <Card>
          <CardHeader title="OPD visits" action={<Button size="sm" onClick={() => setAddOpd(true)}><Plus className="w-4 h-4" /> Add visit</Button>} />
          <div className="space-y-3">
            {data.opdVisits.filter((v) => v.patientId === patient.id).sort((a, b) => +new Date(b.visitDate) - +new Date(a.visitDate)).map((v) => (
              <div key={v.id} className="glass-subtle rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-slate-900">{formatDateTime(v.visitDate)} · {v.visitType} · {facilityMap.get(v.facilityId)?.name}</div>
                    <div className="text-sm text-slate-700 mt-1">{v.chiefComplaint}</div>
                    <div className="text-xs text-slate-500 mt-1 line-clamp-2">{v.assessment ?? ''}</div>
                  </div>
                  <StatusBadge status={v.status} />
                </div>
                <div className="text-xs text-slate-500 mt-2">{v.clinician} · {formatDateTime(v.createdAt)} {v.amendmentHistory?.length ? `· ${v.amendmentHistory.length} amendments` : ''}</div>
              </div>
            ))}
            {data.opdVisits.filter((v) => v.patientId === patient.id).length === 0 && <div className="text-sm text-slate-500 py-8 text-center">No OPD visits</div>}
          </div>
        </Card>
      )}
      {tab === 'cancer' && (
        <Card>
          <CardHeader title="Cancer registry" action={<Button size="sm" onClick={() => setAddCancer(true)}><Plus className="w-4 h-4" /> Add episode</Button>} />
          <div className="space-y-3">
            {data.cancerEpisodes.filter((c) => c.patientId === patient.id).map((c) => (
              <div key={c.id} className="glass-subtle rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-slate-900">{c.episodeId} · {c.primarySite} {c.subsite ? `· ${c.subsite}` : ''} · {c.laterality}</div>
                    <div className="text-sm text-slate-600">Dx {formatDate(c.diagnosisDate)} · {c.histology ?? '—'} {c.histologyGrade ?? ''}</div>
                    <div className="text-xs mt-1 flex gap-2 flex-wrap"><Badge>{c.stagingSystem ?? '—'} {c.stagingEdition ?? ''}</Badge> <Badge>{c.stageType}</Badge> <span>{c.tCategory} {c.nCategory} {c.mCategory} {c.stageGroup}</span></div>
                    {c.mdtNotes && <div className="text-xs text-slate-600 mt-2 bg-slate-50 p-2 rounded-lg">MDT {formatDate(c.mdtDate)}: {c.mdtNotes}</div>}
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <div className="text-xs text-slate-500 mt-2">{formatDateTime(c.createdAt)} · {c.createdBy}</div>
              </div>
            ))}
            {data.cancerEpisodes.filter((c) => c.patientId === patient.id).length === 0 && <div className="text-sm text-slate-500 py-8 text-center">No cancer episodes</div>}
          </div>
        </Card>
      )}
      {tab === 'ot' && (
        <Card>
          <CardHeader title="Operations" action={<Button size="sm" onClick={() => setAddOt(true)}><Plus className="w-4 h-4" /> Add operation</Button>} />
          <div className="space-y-3">
            {data.operations.filter((o) => o.patientId === patient.id).map((o) => (
              <div key={o.id} className="glass-subtle rounded-xl p-4">
                <div className="flex justify-between gap-2">
                  <div className="font-medium text-slate-900">{formatDate(o.operationDate)} · {o.procedures.map((p) => p.name).join(' + ')} · {facilityMap.get(o.facilityId)?.name}</div>
                  <StatusBadge status={o.status} />
                </div>
                <div className="text-sm text-slate-600 mt-1">Pre: {o.preOpDiagnosis} → Post: {o.postOpDiagnosis}</div>
                <div className="text-xs text-slate-500 mt-1">Surgeon: {o.primarySurgeon} {o.assistants?.length ? `· Assist: ${o.assistants.join(', ')}` : ''} · Anaesthesia: {o.anaesthesiaType ?? '—'}</div>
                {o.findings && <div className="text-xs text-slate-600 mt-2 bg-slate-50 p-2 rounded-lg">{o.findings}</div>}
                <div className="text-xs text-slate-500 mt-2">{o.amendmentHistory?.length ? `${o.amendmentHistory.length} amendments` : ''}</div>
              </div>
            ))}
            {data.operations.filter((o) => o.patientId === patient.id).length === 0 && <div className="text-sm text-slate-500 py-8 text-center">No operations</div>}
          </div>
        </Card>
      )}
      {tab === 'investigations' && (
        <Card>
          <CardHeader title="Investigations & pathology" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-sm mb-2">Investigations</h4>
              {data.investigations.filter((i) => i.patientId === patient.id).map((inv) => (
                <div key={inv.id} className="glass-subtle rounded-lg p-3 mb-2">
                  <div className="text-sm font-medium">{inv.type} · {formatDate(inv.date)}</div>
                  <div className="text-xs text-slate-600">{inv.summary}</div>
                  <div className="text-xs text-slate-400">{inv.reportReference}</div>
                </div>
              ))}
              {data.investigations.filter((i) => i.patientId === patient.id).length === 0 && <div className="text-xs text-slate-500">No investigations</div>}
            </div>
            <div>
              <h4 className="font-medium text-sm mb-2">Pathology reports</h4>
              {data.pathology.filter((p) => p.patientId === patient.id).map((pr) => (
                <div key={pr.id} className="glass-subtle rounded-lg p-3 mb-2">
                  <div className="text-sm font-medium">{pr.specimenSite} · {formatDate(pr.reportDate)}</div>
                  <div className="text-xs text-slate-600">{pr.histology} {pr.grade ? `· ${pr.grade}` : ''}</div>
                  <div className="text-xs text-slate-600">{pr.findings}</div>
                  <div className="text-xs text-slate-400">{pr.labName} · {pr.reportId}</div>
                </div>
              ))}
              {data.pathology.filter((p) => p.patientId === patient.id).length === 0 && <div className="text-xs text-slate-500">No pathology reports</div>}
            </div>
          </div>
        </Card>
      )}
      {tab === 'followups' && (
        <Card>
          <CardHeader title="Follow-ups" action={<Button size="sm" onClick={() => setAddFu(true)}><Plus className="w-4 h-4" /> Add follow-up</Button>} />
          <div className="space-y-2">
            {data.followUps.filter((f) => f.patientId === patient.id).sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate)).map((fu) => (
              <div key={fu.id} className="glass-subtle rounded-xl p-3 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">{fu.reason} · {formatDate(fu.dueDate)}</div>
                  <div className="text-xs text-slate-500">{facilityMap.get(fu.facilityId ?? '')?.name ?? '—'} · {fu.assignedTo ?? '—'}</div>
                </div>
                <StatusBadge status={fu.status} />
              </div>
            ))}
            {data.followUps.filter((f) => f.patientId === patient.id).length === 0 && <div className="text-sm text-slate-500 py-8 text-center">No follow-ups</div>}
          </div>
        </Card>
      )}
      {tab === 'documents' && (
        <Card>
          <CardHeader title="Documents" subtitle="References only — no real uploads in prototype" />
          <div className="text-sm text-slate-500 py-8 text-center border-2 border-dashed border-white/80 rounded-xl">Document references appear here. Real deployment requires private object storage with short-lived authorised links.</div>
        </Card>
      )}
      {tab === 'activity' && (
        <Card>
          <CardHeader title="Activity & amendments" />
          <div className="space-y-2 text-sm">
            {data.auditEvents.filter((a) => {
              // show events for this patient’s records
              const relatedIds = [
                patient.id,
                ...data.opdVisits.filter((v) => v.patientId === patient.id).map((v) => v.id),
                ...data.cancerEpisodes.filter((c) => c.patientId === patient.id).map((c) => c.id),
                ...data.operations.filter((o) => o.patientId === patient.id).map((o) => o.id),
              ]
              return relatedIds.includes(a.recordId)
            }).map((a) => (
              <div key={a.id} className="flex justify-between border-b border-slate-100 py-2">
                <span>{a.action} — {a.recordType} <span className="text-slate-500">{a.recordId.slice(0, 8)}</span> by {a.userName}</span>
                <span className="text-slate-500">{formatDateTime(a.timestamp)}</span>
              </div>
            ))}
            {data.auditEvents.filter((a) => {
              const relatedIds = [patient.id, ...data.opdVisits.filter((v) => v.patientId === patient.id).map((v) => v.id)]
              return relatedIds.includes(a.recordId)
            }).length === 0 && <div className="text-slate-500 py-4 text-center">No activity yet. Amendments to finalised records will appear here.</div>}
            <div className="text-xs text-slate-500 mt-4 bg-amber-100/50 backdrop-blur-md border border-amber-200/60 rounded-lg p-3">Finalised records preserve history — amendments create a new version with reason and do not silently overwrite. This prototype simulates the UI; production requires server-side audit logs.</div>
          </div>
        </Card>
      )}

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit patient">
        <PatientForm patient={patient} onClose={() => setEditOpen(false)} />
      </Modal>
      <Modal open={addOpd} onClose={() => setAddOpd(false)} title="Add OPD visit" widthClass="max-w-3xl">
        <OpdForm patientId={patient.id} onClose={() => setAddOpd(false)} />
      </Modal>
      <Modal open={addCancer} onClose={() => setAddCancer(false)} title="Add cancer episode" widthClass="max-w-3xl">
        <CancerForm patientId={patient.id} onClose={() => setAddCancer(false)} />
      </Modal>
      <Modal open={addOt} onClose={() => setAddOt(false)} title="Add operation" widthClass="max-w-3xl">
        <OtForm patientId={patient.id} onClose={() => setAddOt(false)} />
      </Modal>
      <Modal open={addFu} onClose={() => setAddFu(false)} title="Add follow-up">
        <FollowUpForm patientId={patient.id} onClose={() => setAddFu(false)} />
      </Modal>
    </div>
  )
}
