import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { initialData } from '../data/seedData'
import type {
  Patient,
  Facility,
  OpdVisit,
  CancerEpisode,
  OperationRecord,
  FollowUp,
  Investigation,
  PathologyReport,
  AuditEvent,
} from '../types'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from './auth'
import {
  mapPatientFromDb,
  mapPatientToDb,
  mapFacilityFromDb,
  mapFacilityToDb,
  mapOpdFromDb,
  mapOpdToDb,
  mapCancerFromDb,
  mapCancerToDb,
  mapOtFromDb,
  mapOtToDb,
  mapFollowUpFromDb,
  mapFollowUpToDb,
} from './supabaseMappers'

const STORAGE_KEY = 'clinicalog_demo_v1'

interface StoreData {
  facilities: Facility[]
  patients: Patient[]
  opdVisits: OpdVisit[]
  cancerEpisodes: CancerEpisode[]
  operations: OperationRecord[]
  followUps: FollowUp[]
  investigations: Investigation[]
  pathology: PathologyReport[]
  auditEvents: AuditEvent[]
}

function loadInitial(): StoreData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as StoreData
      if (!parsed.auditEvents) parsed.auditEvents = []
      return parsed
    }
  } catch {}
  return { ...initialData, auditEvents: [] as AuditEvent[] }
}

function persist(data: StoreData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

function genId(prefix: string) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

function nextPatientNumber(patients: Patient[]): string {
  const max = patients.reduce((m, p) => {
    const n = parseInt(p.patientNumber.replace('CL-', ''), 10)
    return isNaN(n) ? m : Math.max(m, n)
  }, 100)
  const next = max + 1
  return `CL-${String(next).padStart(6, '0')}`
}

interface AssistantInvite {
  id: string
  email: string
  full_name: string
  created_at: string
}

interface DataContextValue {
  data: StoreData
  loading: boolean
  /** true once the first load (Supabase fetch or local hydrate) has settled */
  ready: boolean
  usingSupabase: boolean
  workspaceId: string | null
  isDoctor: boolean
  assistantInvite: AssistantInvite | null
  addPatient: (p: Omit<Patient, 'id' | 'patientNumber' | 'createdAt' | 'updatedAt'>) => Patient
  updatePatient: (id: string, patch: Partial<Patient>) => void
  addFacility: (f: Omit<Facility, 'id'>) => Facility
  updateFacility: (id: string, patch: Partial<Facility>) => void
  addOpdVisit: (v: Omit<OpdVisit, 'id' | 'createdAt' | 'updatedAt'>) => OpdVisit
  updateOpdVisit: (id: string, patch: Partial<OpdVisit>) => void
  addCancerEpisode: (e: Omit<CancerEpisode, 'id' | 'episodeId' | 'createdAt' | 'updatedAt'>) => CancerEpisode
  updateCancerEpisode: (id: string, patch: Partial<CancerEpisode>) => void
  addOperation: (o: Omit<OperationRecord, 'id' | 'createdAt' | 'updatedAt'>) => OperationRecord
  updateOperation: (id: string, patch: Partial<OperationRecord>) => void
  addFollowUp: (f: Omit<FollowUp, 'id' | 'createdAt' | 'updatedAt'>) => FollowUp
  updateFollowUp: (id: string, patch: Partial<FollowUp>) => void
  addAudit: (a: Omit<AuditEvent, 'id' | 'timestamp'>) => void
  resetDemo: () => void
  findDuplicates: (name: string, dob?: string, phone?: string, excludeId?: string) => Patient[]
  refresh: () => Promise<void>
  addAssistant: (email: string, fullName: string) => Promise<{ error: string | null }>
  removeAssistant: () => Promise<{ error: string | null }>
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, isConfigured } = useAuth()
  const usingSupabase = isSupabaseConfigured && isConfigured && !!user && !!supabase

  const [data, setData] = useState<StoreData>(() => loadInitial())
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [assistantInvite, setAssistantInvite] = useState<AssistantInvite | null>(null)
  const [isDoctor, setIsDoctor] = useState(true) // default true in demo

  const ASSISTANT_KEY = 'clinicalog_assistant_v1'
  const loadAssistantDemo = (): AssistantInvite | null => {
    try {
      const raw = localStorage.getItem(ASSISTANT_KEY)
      return raw ? (JSON.parse(raw) as AssistantInvite) : null
    } catch {
      return null
    }
  }

  const persistLocal = useCallback(
    (d: StoreData) => {
      if (!usingSupabase) persist(d)
    },
    [usingSupabase],
  )

  useEffect(() => {
    if (!usingSupabase) persistLocal(data)
  }, [data, persistLocal, usingSupabase])

  // In demo mode there is no async fetch — mark ready on the next frame so
  // skeletons render for one paint instead of the page flashing empty state.
  useEffect(() => {
    if (usingSupabase) return
    if (ready) return
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [usingSupabase, ready])

  // Supabase bootstrap + fetch
  const fetchAll = useCallback(async () => {
    if (!usingSupabase || !supabase || !user) return
    setLoading(true)
    try {
      // 1) ensure workspace
      let wsId: string | null = null
      const { data: memberships } = await supabase.from('workspace_members').select('workspace_id').eq('user_id', user.id).limit(1)
      if (memberships && memberships.length > 0) {
        wsId = memberships[0].workspace_id as string
      } else {
        // create workspace — use profile name from auth metadata, never demo
        const displayName = (user.user_metadata?.full_name as string) || (user.user_metadata?.display_name as string) || user.email?.split('@')[0] || 'My'
        const { data: ws, error: wsErr } = await supabase
          .from('workspaces')
          .insert({ owner_user_id: user.id, name: `${displayName} Workspace` })
          .select('id')
          .single()
        if (wsErr) throw wsErr
        wsId = ws.id as string
        await supabase.from('workspace_members').insert({ workspace_id: wsId, user_id: user.id, role: 'owner' })
        // seed facilities if needed
        await supabase.from('facilities').insert(
          initialData.facilities
            .filter((f) => f.status === 'Active')
            .slice(0, 3)
            .map((f) => ({ workspace_id: wsId, name: f.name, facility_type: f.facilityType, address: f.address, contact: f.contact, status: f.status, notes: f.notes })),
        )
      }
      if (!wsId) throw new Error('No workspace')
      setWorkspaceId(wsId)

      // 1b) determine if current user is doctor (owner) and fetch assistant (only 1)
      try {
        const { data: wsRow } = await supabase.from('workspaces').select('owner_user_id').eq('id', wsId).single()
        setIsDoctor(wsRow ? (wsRow as Record<string, unknown>).owner_user_id === user.id : true)
        const { data: inv } = await supabase.from('assistant_invites').select('*').eq('workspace_id', wsId).limit(1).maybeSingle()
        if (inv) setAssistantInvite(inv as unknown as AssistantInvite)
        else setAssistantInvite(null)
      } catch {
        setAssistantInvite(null)
      }

      // 2) fetch all tables in parallel
      const [facRes, patRes, opdRes, caRes, otRes, fuRes, invRes, pathRes] = await Promise.all([
        supabase.from('facilities').select('*').eq('workspace_id', wsId).order('name'),
        supabase.from('patients').select('*').eq('workspace_id', wsId).order('created_at', { ascending: false }),
        supabase.from('opd_visits').select('*').eq('workspace_id', wsId).order('visit_date', { ascending: false }),
        supabase.from('cancer_episodes').select('*').eq('workspace_id', wsId).order('diagnosis_date', { ascending: false }),
        supabase.from('ot_records').select('*').eq('workspace_id', wsId).order('procedure_date', { ascending: false }),
        supabase.from('follow_ups').select('*').eq('workspace_id', wsId).order('due_date', { ascending: true }),
        supabase.from('investigations').select('*').eq('workspace_id', wsId).order('date', { ascending: false }),
        supabase.from('pathology_reports').select('*').eq('workspace_id', wsId).order('report_date', { ascending: false }),
      ])

      const facilities = (facRes.data ?? []).map((r) => mapFacilityFromDb(r as Record<string, unknown>))
      const patients = (patRes.data ?? []).map((r) => mapPatientFromDb(r as Record<string, unknown>))
      const opdVisits = (opdRes.data ?? []).map((r) => mapOpdFromDb(r as Record<string, unknown>))
      const cancerEpisodes = (caRes.data ?? []).map((r) => mapCancerFromDb(r as Record<string, unknown>))
      const otRows = (otRes.data ?? []) as Record<string, unknown>[]
      // fetch OT child tables
      let operations: OperationRecord[] = []
      if (otRows.length > 0) {
        const otIds = otRows.map((r) => r.id as string)
        const [procRes, teamRes] = await Promise.all([
          supabase.from('ot_procedures').select('*').in('ot_record_id', otIds),
          supabase.from('ot_team_members').select('*').in('ot_record_id', otIds),
        ])
        const procByOt = new Map<string, OperationRecord['procedures']>()
        for (const p of (procRes.data ?? []) as Record<string, unknown>[]) {
          const oid = p.ot_record_id as string
          if (!procByOt.has(oid)) procByOt.set(oid, [])
          procByOt.get(oid)!.push({ name: p.procedure_name as string, site: (p.site as string) ?? undefined, laterality: (p.laterality as OperationRecord['procedures'][number]['laterality']) ?? undefined, details: (p.details as string) ?? undefined })
        }
        const teamByOt = new Map<string, string[]>()
        for (const t of (teamRes.data ?? []) as Record<string, unknown>[]) {
          const oid = t.ot_record_id as string
          if (!teamByOt.has(oid)) teamByOt.set(oid, [])
          teamByOt.get(oid)!.push(t.name as string)
        }
        operations = otRows.map((r) => mapOtFromDb(r, procByOt.get(r.id as string) ?? [{ name: 'Procedure' }], teamByOt.get(r.id as string) ?? []))
      }
      const followUps = (fuRes.data ?? []).map((r) => mapFollowUpFromDb(r as Record<string, unknown>))
      const investigations = (invRes.data ?? []).map((r) => ({ id: r.id, patientId: r.patient_id, type: r.investigation_type, date: r.date, summary: r.result_summary ?? '', reportReference: r.report_reference ?? undefined, facilityId: r.facility_id ?? undefined, status: r.status, documentId: r.document_id ?? undefined } as Investigation))
      const pathology = (pathRes.data ?? []).map((r) => ({ id: r.id, patientId: r.patient_id, reportDate: r.report_date, specimenSite: r.specimen_site, histology: r.histology, grade: r.grade ?? undefined, labName: r.lab_name ?? undefined, reportId: r.report_id ?? undefined, findings: r.findings ?? undefined, margins: r.margins ?? undefined, pne: r.pne ?? undefined, lve: r.lve ?? undefined, ene: r.ene ?? undefined, nodes: r.nodes ?? undefined, documentId: r.document_id ?? undefined } as PathologyReport))

      // Only replace if we got data; if all empty, keep local seed but with workspace
      if (patients.length === 0 && facilities.length === 0) {
        // keep local initial as optimistic, but workspace is set
        // optionally seed patients? we skip auto-seed to avoid duplicating demo
      } else {
        setData({
          facilities: facilities.length ? facilities : data.facilities,
          patients,
          opdVisits,
          cancerEpisodes,
          operations,
          followUps,
          investigations,
          pathology,
          auditEvents: [],
        })
      }
    } catch (e) {
      console.error('Supabase fetch error', e)
    } finally {
      setLoading(false)
      setReady(true)
    }
  }, [usingSupabase, user])

  useEffect(() => {
    if (usingSupabase) fetchAll()
  }, [usingSupabase, fetchAll])

  useEffect(() => {
    if (!usingSupabase) {
      setAssistantInvite(loadAssistantDemo())
      setIsDoctor(true)
    }
  }, [usingSupabase])

  const addAudit: DataContextValue['addAudit'] = (a) => {
    const ev: AuditEvent = { ...a, id: genId('aud'), timestamp: new Date().toISOString() }
    setData((prev) => ({ ...prev, auditEvents: [ev, ...prev.auditEvents] }))
    if (usingSupabase && supabase && workspaceId) {
      supabase.from('audit_logs').insert({ workspace_id: workspaceId, user_id: user!.id, record_id: a.recordId, record_type: a.recordType, action: a.action, details: a.details ?? null }).then(() => {})
    }
  }

  const addPatient: DataContextValue['addPatient'] = (p) => {
    const patient: Patient = {
      ...p,
      id: genId('p'),
      patientNumber: nextPatientNumber(data.patients),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    // optimistic local
    setData((prev) => ({ ...prev, patients: [patient, ...prev.patients] }))
    setTimeout(() => addAudit({ recordId: patient.id, recordType: 'Patient', action: 'Created', userId: user?.id ?? 'current', userName: user?.email ?? 'Current User', details: patient.name }), 0)

    if (usingSupabase && supabase && workspaceId) {
      // fire supabase insert (id will be overwritten by DB uuid, but we keep optimistic)
      const dbRow = mapPatientToDb({ ...patient, workspace_id: workspaceId, patient_number: patient.patientNumber } as never)
      // remove id to let DB generate uuid, but keep optimistic id for now; we update after
      const { id: _id, ...rest } = dbRow as Record<string, unknown>
      supabase
        .from('patients')
        .insert(rest as never)
        .select('*')
        .single()
        .then(({ data: row, error }) => {
          if (!error && row) {
            const mapped = mapPatientFromDb(row as Record<string, unknown>)
            // replace optimistic with real DB row (real uuid)
            setData((prev) => ({ ...prev, patients: prev.patients.map((x) => (x.id === patient.id ? mapped : x)) }))
          } else if (error) console.error('addPatient supabase error', error)
        })
    }
    return patient
  }

  const updatePatient: DataContextValue['updatePatient'] = (id, patch) => {
    setData((prev) => ({ ...prev, patients: prev.patients.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p)) }))
    if (usingSupabase && supabase) {
      const dbPatch: Record<string, unknown> = {}
      if (patch.name !== undefined) dbPatch.name = patch.name
      if (patch.dob !== undefined) dbPatch.dob = patch.dob || null
      if (patch.age !== undefined) dbPatch.age = patch.age ?? null
      if (patch.sex !== undefined) dbPatch.sex = patch.sex
      if (patch.phone !== undefined) dbPatch.phone = patch.phone
      if (patch.email !== undefined) dbPatch.email = patch.email
      if (patch.address !== undefined) dbPatch.address = patch.address
      if (patch.emergencyContact !== undefined) dbPatch.emergency_contact = patch.emergencyContact
      if (patch.primaryFacilityId !== undefined) dbPatch.primary_facility_id = patch.primaryFacilityId || null
      if (patch.status !== undefined) dbPatch.status = patch.status
      if (patch.notes !== undefined) dbPatch.notes = patch.notes
      if (patch.allergies !== undefined) dbPatch.allergies = patch.allergies
      if (patch.medicalHistory !== undefined) dbPatch.medical_history = patch.medicalHistory
      supabase.from('patients').update(dbPatch as never).eq('id', id).then(({ error }) => { if (error) console.error(error) })
    }
  }

  const addFacility: DataContextValue['addFacility'] = (f) => {
    const fac: Facility = { ...f, id: genId('f') }
    setData((prev) => ({ ...prev, facilities: [...prev.facilities, fac] }))
    if (usingSupabase && supabase && workspaceId) {
      const dbRow = mapFacilityToDb({ ...fac, workspace_id: workspaceId })
      const { id: _id, ...rest } = dbRow as Record<string, unknown>
      supabase.from('facilities').insert(rest as never).select('*').single().then(({ data: row, error }) => {
        if (!error && row) {
          const mapped = mapFacilityFromDb(row as Record<string, unknown>)
          setData((prev) => ({ ...prev, facilities: prev.facilities.map((x) => (x.id === fac.id ? mapped : x)) }))
        } else if (error) console.error(error)
      })
    }
    return fac
  }
  const updateFacility: DataContextValue['updateFacility'] = (id, patch) => {
    setData((prev) => ({ ...prev, facilities: prev.facilities.map((r) => (r.id === id ? { ...r, ...patch } : r)) }))
    if (usingSupabase && supabase) {
      const dbPatch: Record<string, unknown> = {}
      if (patch.name !== undefined) dbPatch.name = patch.name
      if (patch.facilityType !== undefined) dbPatch.facility_type = patch.facilityType
      if (patch.address !== undefined) dbPatch.address = patch.address
      if (patch.contact !== undefined) dbPatch.contact = patch.contact
      if (patch.status !== undefined) dbPatch.status = patch.status
      if (patch.notes !== undefined) dbPatch.notes = patch.notes
      supabase.from('facilities').update(dbPatch as never).eq('id', id).then(({ error }) => { if (error) console.error(error) })
    }
  }

  const addOpdVisit: DataContextValue['addOpdVisit'] = (v) => {
    const rec: OpdVisit = { ...v, id: genId('opd'), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), amendmentHistory: [] }
    setData((prev) => ({ ...prev, opdVisits: [rec, ...prev.opdVisits] }))
    if (usingSupabase && supabase && workspaceId) {
      const dbRow = mapOpdToDb({ ...rec, workspace_id: workspaceId })
      const { id: _id, ...rest } = dbRow as Record<string, unknown>
      supabase.from('opd_visits').insert(rest as never).select('*').single().then(({ data: row, error }) => {
        if (!error && row) {
          const mapped = mapOpdFromDb(row as Record<string, unknown>)
          setData((prev) => ({ ...prev, opdVisits: prev.opdVisits.map((x) => (x.id === rec.id ? mapped : x)) }))
        } else if (error) console.error(error)
      })
    }
    return rec
  }
  const updateOpdVisit: DataContextValue['updateOpdVisit'] = (id, patch) => {
    setData((prev) => ({ ...prev, opdVisits: prev.opdVisits.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r)) }))
    if (usingSupabase && supabase) {
      const dbPatch: Record<string, unknown> = {}
      if (patch.facilityId !== undefined) dbPatch.facility_id = patch.facilityId
      if (patch.visitDate !== undefined) dbPatch.visit_date = patch.visitDate
      if (patch.visitType !== undefined) dbPatch.visit_type = patch.visitType
      if (patch.chiefComplaint !== undefined) dbPatch.chief_complaint = patch.chiefComplaint
      if (patch.assessment !== undefined) dbPatch.assessment = patch.assessment
      if (patch.plan !== undefined) dbPatch.plan = patch.plan
      if (patch.status !== undefined) dbPatch.status = patch.status
      if (Object.keys(dbPatch).length) supabase.from('opd_visits').update(dbPatch as never).eq('id', id).then(({ error }) => { if (error) console.error(error) })
    }
  }

  const addCancerEpisode: DataContextValue['addCancerEpisode'] = (e) => {
    const nextNum = data.cancerEpisodes.length + 1
    const episodeId = `CA-2024-${String(nextNum + 10).padStart(3, '0')}`
    const rec: CancerEpisode = { ...e, id: genId('ca'), episodeId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), amendmentHistory: [] }
    setData((prev) => ({ ...prev, cancerEpisodes: [rec, ...prev.cancerEpisodes] }))
    if (usingSupabase && supabase && workspaceId) {
      const dbRow = mapCancerToDb({ ...rec, workspace_id: workspaceId })
      const { id: _id, ...rest } = dbRow as Record<string, unknown>
      supabase.from('cancer_episodes').insert(rest as never).select('*').single().then(({ data: row, error }) => {
        if (!error && row) {
          const mapped = mapCancerFromDb(row as Record<string, unknown>)
          setData((prev) => ({ ...prev, cancerEpisodes: prev.cancerEpisodes.map((x) => (x.id === rec.id ? mapped : x)) }))
        } else if (error) console.error(error)
      })
    }
    return rec
  }
  const updateCancerEpisode: DataContextValue['updateCancerEpisode'] = (id, patch) => {
    setData((prev) => ({ ...prev, cancerEpisodes: prev.cancerEpisodes.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r)) }))
    if (usingSupabase && supabase) {
      const dbPatch: Record<string, unknown> = {}
      if (patch.primarySite !== undefined) dbPatch.primary_site = patch.primarySite
      if (patch.status !== undefined) dbPatch.status = patch.status
      if (Object.keys(dbPatch).length) supabase.from('cancer_episodes').update(dbPatch as never).eq('id', id).then(({ error }) => { if (error) console.error(error) })
    }
  }

  const addOperation: DataContextValue['addOperation'] = (o) => {
    const rec: OperationRecord = { ...o, id: genId('ot'), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), amendmentHistory: [] }
    setData((prev) => ({ ...prev, operations: [rec, ...prev.operations] }))
    if (usingSupabase && supabase && workspaceId) {
      const dbRow = mapOtToDb({ ...rec, workspace_id: workspaceId })
      const { id: _id, ...rest } = dbRow as Record<string, unknown>
      supabase.from('ot_records').insert(rest as never).select('*').single().then(async ({ data: row, error }) => {
        if (!error && row) {
          const newId = (row as Record<string, unknown>).id as string
          // insert child tables
          if (rec.procedures.length) {
            await supabase!.from('ot_procedures').insert(rec.procedures.map((p) => ({ ot_record_id: newId, procedure_name: p.name, site: p.site ?? null, laterality: p.laterality ?? null, details: p.details ?? null } as never)))
          }
          if (rec.assistants?.length) {
            await supabase!.from('ot_team_members').insert(rec.assistants.map((n) => ({ ot_record_id: newId, name: n, role: 'Assistant' as never })))
          }
          const mapped = mapOtFromDb(row as Record<string, unknown>, rec.procedures, rec.assistants ?? [])
          setData((prev) => ({ ...prev, operations: prev.operations.map((x) => (x.id === rec.id ? mapped : x)) }))
        } else if (error) console.error(error)
      })
    }
    return rec
  }
  const updateOperation: DataContextValue['updateOperation'] = (id, patch) => {
    setData((prev) => ({ ...prev, operations: prev.operations.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r)) }))
    if (usingSupabase && supabase) {
      const dbPatch: Record<string, unknown> = {}
      if (patch.status !== undefined) dbPatch.status = patch.status
      if (Object.keys(dbPatch).length) supabase.from('ot_records').update(dbPatch as never).eq('id', id).then(({ error }) => { if (error) console.error(error) })
    }
  }

  const addFollowUp: DataContextValue['addFollowUp'] = (f) => {
    const rec: FollowUp = { ...f, id: genId('fu'), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    setData((prev) => ({ ...prev, followUps: [rec, ...prev.followUps] }))
    if (usingSupabase && supabase && workspaceId) {
      const dbRow = mapFollowUpToDb({ ...rec, workspace_id: workspaceId })
      const { id: _id, ...rest } = dbRow as Record<string, unknown>
      supabase.from('follow_ups').insert(rest as never).select('*').single().then(({ data: row, error }) => {
        if (!error && row) {
          const mapped = mapFollowUpFromDb(row as Record<string, unknown>)
          setData((prev) => ({ ...prev, followUps: prev.followUps.map((x) => (x.id === rec.id ? mapped : x)) }))
        } else if (error) console.error(error)
      })
    }
    return rec
  }
  const updateFollowUp: DataContextValue['updateFollowUp'] = (id, patch) => {
    setData((prev) => ({ ...prev, followUps: prev.followUps.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r)) }))
    if (usingSupabase && supabase) {
      const dbPatch: Record<string, unknown> = {}
      if (patch.status !== undefined) dbPatch.status = patch.status
      if (patch.dueDate !== undefined) dbPatch.due_date = patch.dueDate
      if (Object.keys(dbPatch).length) supabase.from('follow_ups').update(dbPatch as never).eq('id', id).then(({ error }) => { if (error) console.error(error) })
    }
  }

  const addAssistant: DataContextValue['addAssistant'] = async (email, fullName) => {
    if (!isDoctor) return { error: 'Only doctor can add assistant' }
    if (assistantInvite) return { error: 'Only one assistant allowed' }
    if (!email.trim() || !fullName.trim()) return { error: 'Name and email required' }
    const invite: AssistantInvite = { id: genId('asst'), email: email.trim().toLowerCase(), full_name: fullName.trim(), created_at: new Date().toISOString() }
    if (usingSupabase && supabase && workspaceId) {
      const { data: row, error } = await supabase.from('assistant_invites').insert({ workspace_id: workspaceId, email: invite.email, full_name: invite.full_name, invited_by: user?.id ?? null }).select('*').single()
      if (error) return { error: error.message }
      setAssistantInvite(row as unknown as AssistantInvite)
      return { error: null }
    } else {
      // demo mode
      localStorage.setItem(ASSISTANT_KEY, JSON.stringify(invite))
      setAssistantInvite(invite)
      return { error: null }
    }
  }

  const removeAssistant: DataContextValue['removeAssistant'] = async () => {
    if (!isDoctor) return { error: 'Only doctor can remove assistant' }
    if (!assistantInvite) return { error: null }
    if (usingSupabase && supabase && workspaceId) {
      const { error } = await supabase.from('assistant_invites').delete().eq('workspace_id', workspaceId)
      if (error) return { error: error.message }
      setAssistantInvite(null)
      return { error: null }
    } else {
      localStorage.removeItem(ASSISTANT_KEY)
      setAssistantInvite(null)
      return { error: null }
    }
  }

  const resetDemo = () => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(ASSISTANT_KEY)
    setData({ ...initialData, auditEvents: [] })
    setAssistantInvite(null)
    // do not wipe Supabase; supabase reset requires manual SQL
  }

  const findDuplicates: DataContextValue['findDuplicates'] = (name, dob, phone, excludeId) => {
    const n = name.trim().toLowerCase()
    return data.patients.filter((p) => {
      if (excludeId && p.id === excludeId) return false
      const nameMatch = n && p.name.toLowerCase().includes(n) && n.length >= 3
      const dobMatch = dob && p.dob === dob
      const phoneMatch = phone && p.phone?.replace(/\s/g, '') === phone.replace(/\s/g, '')
      if (phoneMatch && phone) return true
      if (dobMatch && dob) return true
      if (nameMatch && (dobMatch || phoneMatch)) return true
      if (nameMatch && n.split(' ').length >= 2) {
        const tokens = n.split(' ')
        const pTokens = p.name.toLowerCase().split(' ')
        const overlap = tokens.filter((t) => pTokens.includes(t)).length
        if (overlap >= 2) return true
      }
      return false
    })
  }

  const refresh = async () => {
    await fetchAll()
  }

  const value: DataContextValue = {
    data,
    loading,
    ready,
    usingSupabase,
    workspaceId,
    isDoctor,
    assistantInvite,
    addPatient,
    updatePatient,
    addFacility,
    updateFacility,
    addOpdVisit,
    updateOpdVisit,
    addCancerEpisode,
    updateCancerEpisode,
    addOperation,
    updateOperation,
    addFollowUp,
    updateFollowUp,
    addAudit,
    resetDemo,
    findDuplicates,
    refresh,
    addAssistant,
    removeAssistant,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}

export function useFacilityMap() {
  const { data } = useData()
  return new Map(data.facilities.map((f) => [f.id, f]))
}
