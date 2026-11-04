import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
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
import { friendlySaveError } from '../utils/errors'
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

const STORAGE_KEY = 'clinicalog_demo_v2'
const LEGACY_STORAGE_KEY = 'clinicalog_demo_v1'

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
    // one-time cleanup of the retired v1 store (held the old sample data)
    localStorage.removeItem(LEGACY_STORAGE_KEY)
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

// Client-generated UUIDs so a record keeps the SAME id locally and in
// Supabase. That lets one submit create a patient + a linked OT without the
// OT pointing at a throwaway local id (Supabase uuid columns reject those).
function genId(_prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback for non-secure contexts: random UUIDv4
  const r = () =>
    Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1)
  return `${r().slice(0, 4)}${r()}-${r()}-4${r().slice(1)}-8${r().slice(1)}-${r()}${r()}${r()}`.slice(0, 36)
}

function maxPatientNumber(patients: Patient[]): number {
  return patients.reduce((m, p) => {
    const n = parseInt(p.patientNumber.replace('CL-', ''), 10)
    return isNaN(n) ? m : Math.max(m, n)
  }, 100)
}

// Patient numbers are unique per workspace (DB constraint on
// (workspace_id, patient_number)). Deriving the next number from React state
// meant two records created in the same tick — e.g. a CSV import loop, where
// state has not re-rendered yet — were handed the SAME number, and the second
// insert was rejected. The row silently disappeared on the next reload.
// This allocator keeps a monotonic counter instead, and insertPatient() retries
// with the next number if the server still reports a collision.
let patientNumberCounter = 0
function allocatePatientNumber(): string {
  patientNumberCounter += 1
  return `CL-${String(patientNumberCounter).padStart(6, '0')}`
}

interface AssistantInvite {
  id: string
  email: string
  full_name: string
  created_at: string
}

/** Role of a user inside a workspace (mirrors the workspace_members check). */
type MemberRole = 'owner' | 'assistant'

interface DataContextValue {
  data: StoreData
  loading: boolean
  /** true once the first load (Supabase fetch or local hydrate) has settled */
  ready: boolean
  usingSupabase: boolean
  workspaceId: string | null
  isDoctor: boolean
  /** Role of the signed-in user inside the current workspace. */
  memberRole: MemberRole
  /** Message describing the last failed write, or null. */
  saveError: string | null
  /** Dismiss the current save error. */
  clearSaveError: () => void
  assistantInvite: AssistantInvite | null
  addPatient: (p: Omit<Patient, 'id' | 'patientNumber' | 'createdAt' | 'updatedAt'>) => Patient
  updatePatient: (id: string, patch: Partial<Patient>) => void
  addFacility: (f: Omit<Facility, 'id'>) => Facility
  updateFacility: (id: string, patch: Partial<Facility>) => void
  removeFacility: (id: string) => Promise<{ error: string | null }>
  /** Rename the workspace after its owner. No-op for non-owners. */
  renameWorkspace: (name: string) => Promise<{ error: string | null }>
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
  clearPatients: () => Promise<void>
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
  // Role of the signed-in user inside the current workspace. Read from
  // workspace_members — never assumed — so an invited assistant is actually
  // treated as an assistant.
  const [memberRole, setMemberRoleState] = useState<MemberRole>('owner')
  // Mirrors memberRole for use inside fetchAll (a useCallback that must not
  // re-run on every role change).
  const memberRoleRef = useRef<MemberRole>('owner')
  // Last save failure, surfaced to the user. Writes are optimistic, so
  // without this a failed write looks exactly like a successful one.
  const [saveError, setSaveError] = useState<string | null>(null)

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
    // A signed-in workspace must never inherit rows cached by another account
    // or by the local demo mode while its own data is loading.
    setData({ ...initialData, auditEvents: [] })
    try {
      // 1) ensure workspace
      let wsId: string | null = null
      const { data: memberships } = await supabase.from('workspace_members').select('workspace_id, role').eq('user_id', user.id).limit(1)
      if (memberships && memberships.length > 0) {
        wsId = memberships[0].workspace_id as string
        setMemberRoleState((memberships[0].role as MemberRole) ?? 'owner')
        memberRoleRef.current = (memberships[0].role as MemberRole) ?? 'owner'
      } else {
        // 1a) An invited assistant joins the doctor's workspace instead of
        //     creating a workspace of their own. Without this the invite was
        //     decorative: the assistant became a second, unrelated owner and
        //     could never see the patients they were invited to help with.
        const email = (user.email ?? '').toLowerCase()
        const { data: invites } = await supabase
          .from('assistant_invites')
          .select('id, workspace_id, email')
          .eq('email', email)
          .limit(1)
        const invite = invites?.[0]
        if (invite) {
          wsId = invite.workspace_id as string
          // Upsert: a concurrent bootstrap can reach this twice, and the
          // membership row must exist exactly once.
          const { error: memErr } = await supabase
            .from('workspace_members')
            .upsert(
              { workspace_id: wsId, user_id: user.id, role: 'assistant' },
              { onConflict: 'workspace_id,user_id', ignoreDuplicates: true },
            )
          if (memErr) throw memErr
          setMemberRoleState('assistant')
          memberRoleRef.current = 'assistant'
        } else {
          // create workspace — use profile name from auth metadata, never demo
          const displayName = (user.user_metadata?.full_name as string) || (user.user_metadata?.display_name as string) || user.email?.split('@')[0] || 'My'
          const { data: ws, error: wsErr } = await supabase
            .from('workspaces')
            .insert({ owner_user_id: user.id, name: `${displayName} Workspace` })
            .select('id')
            .single()
          if (wsErr) {
            // A concurrent bootstrap (React StrictMode runs effects twice) may
            // have won the race. Re-read the membership and join that workspace
            // instead of creating a second, orphaned one.
            const { data: raced } = await supabase
              .from('workspace_members')
              .select('workspace_id')
              .eq('user_id', user.id)
              .limit(1)
            if (!raced || raced.length === 0) throw wsErr
            wsId = raced[0].workspace_id as string
            setMemberRoleState('owner')
            memberRoleRef.current = 'owner'
          } else {
            wsId = ws.id as string
            await supabase
              .from('workspace_members')
              .upsert(
                { workspace_id: wsId, user_id: user.id, role: 'owner' },
                { onConflict: 'workspace_id,user_id', ignoreDuplicates: true },
              )
            setMemberRoleState('owner')
            memberRoleRef.current = 'owner'
          }
          // seed facilities if needed — upsert so a re-run never duplicates them
          await supabase.from('facilities').upsert(
            initialData.facilities
              .filter((f) => f.status === 'Active')
              .slice(0, 3)
              .map((f) => ({ workspace_id: wsId, name: f.name, facility_type: f.facilityType, address: f.address, contact: f.contact, status: f.status, notes: f.notes })),
            { onConflict: 'workspace_id,name', ignoreDuplicates: true },
          )
        }
      }
      if (!wsId) throw new Error('No workspace')
      setWorkspaceId(wsId)

      // 1b) determine if current user is doctor (owner) and fetch assistant (only 1)
      try {
        const { data: wsRow } = await supabase.from('workspaces').select('owner_user_id').eq('id', wsId).single()
        const isOwner = wsRow ? (wsRow as Record<string, unknown>).owner_user_id === user.id : true
        // Only the workspace owner is the doctor. An invited assistant is a
        // member of someone else's workspace and must not be treated as one.
        setIsDoctor(isOwner && memberRoleRef.current !== 'assistant')
        const { data: inv } = await supabase.from('assistant_invites').select('*').eq('workspace_id', wsId).limit(1).maybeSingle()
        if (inv) setAssistantInvite(inv as unknown as AssistantInvite)
        else setAssistantInvite(null)
      } catch {
        setAssistantInvite(null)
      }

      // 2) fetch all tables in parallel
      const [facRes, patRes, opdRes, caRes, otRes, fuRes, invRes, pathRes, auditRes] = await Promise.all([
        supabase.from('facilities').select('*').eq('workspace_id', wsId).order('name'),
        supabase.from('patients').select('*').eq('workspace_id', wsId).order('created_at', { ascending: false }),
        supabase.from('opd_visits').select('*').eq('workspace_id', wsId).order('visit_date', { ascending: false }),
        supabase.from('cancer_episodes').select('*').eq('workspace_id', wsId).order('diagnosis_date', { ascending: false }),
        supabase.from('ot_records').select('*').eq('workspace_id', wsId).order('procedure_date', { ascending: false }),
        supabase.from('follow_ups').select('*').eq('workspace_id', wsId).order('due_date', { ascending: true }),
        supabase.from('investigations').select('*').eq('workspace_id', wsId).order('date', { ascending: false }),
        supabase.from('pathology_reports').select('*').eq('workspace_id', wsId).order('report_date', { ascending: false }),
        supabase.from('audit_logs').select('*').eq('workspace_id', wsId).order('timestamp', { ascending: false }).limit(200),
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
      // The Activity tab reads from here — it was always reset to [] on load,
      // so the audit trail disappeared on every reload.
      const auditEvents: AuditEvent[] = (auditRes.data ?? []).map((r) => ({
        id: r.id as string,
        recordId: (r.record_id as string) ?? '',
        recordType: (r.record_type as string) ?? 'Record',
        action: (r.action as string) ?? 'Updated',
        userId: (r.user_id as string) ?? 'unknown',
        userName: (r.user_id as string) ?? 'Unknown user',
        timestamp: (r.timestamp as string) ?? new Date().toISOString(),
        details: (r.details as string) ?? undefined,
      }))
      const investigations = (invRes.data ?? []).map((r) => ({ id: r.id, patientId: r.patient_id, type: r.investigation_type, date: r.date, summary: r.result_summary ?? '', reportReference: r.report_reference ?? undefined, facilityId: r.facility_id ?? undefined, status: r.status, documentId: r.document_id ?? undefined } as Investigation))
      const pathology = (pathRes.data ?? []).map((r) => ({ id: r.id, patientId: r.patient_id, reportDate: r.report_date, specimenSite: r.specimen_site, histology: r.histology, grade: r.grade ?? undefined, labName: r.lab_name ?? undefined, reportId: r.report_id ?? undefined, findings: r.findings ?? undefined, margins: r.margins ?? undefined, pne: r.pne ?? undefined, lve: r.lve ?? undefined, ene: r.ene ?? undefined, nodes: r.nodes ?? undefined, documentId: r.document_id ?? undefined } as PathologyReport))

      // Always hydrate from this account's server results, including when all
      // clinical tables are empty. Never carry demo or another user's rows over.
      setData({
        facilities,
        patients,
        opdVisits,
        cancerEpisodes,
        operations,
        followUps,
        investigations,
        pathology,
        auditEvents,
      })
    } catch (e) {
      console.error('Failed to load workspace data', e)
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

  // An amendment to a finalised record must be written to the audit log with
  // the reason and the values it replaced — otherwise the change is a silent
  // overwrite once the session ends.
  const recordAmendment = (
    recordId: string,
    recordType: string,
    reason: string | undefined,
    priorValues: Record<string, unknown> | null,
  ) => {
    // audit_logs has no dedicated reason column, so the reason and the
    // replaced values travel together in details.
    const details = JSON.stringify({ reason: reason ?? null, replaced: priorValues ?? null })
    addAudit({
      recordId,
      recordType,
      action: 'Amended',
      userId: user?.id ?? 'current',
      userName: user?.email ?? 'Current User',
      reason,
      details: details ?? undefined,
    })
  }

  const addAudit: DataContextValue['addAudit'] = (a) => {
    const ev: AuditEvent = { ...a, id: genId('aud'), timestamp: new Date().toISOString() }
    setData((prev) => ({ ...prev, auditEvents: [ev, ...prev.auditEvents] }))
    if (usingSupabase && supabase && workspaceId) {
      supabase.from('audit_logs').insert({
        workspace_id: workspaceId,
        user_id: user!.id,
        record_id: a.recordId,
        record_type: a.recordType,
        action: a.action,
        details: a.details ?? null,
      }).then(() => {})
    }
  }

  const addPatient: DataContextValue['addPatient'] = (p) => {
    // Keep the allocator ahead of whatever the server already holds, so a
    // freshly loaded list never hands out a number that is already taken.
    patientNumberCounter = Math.max(patientNumberCounter, maxPatientNumber(data.patients))
    const patient: Patient = {
      ...p,
      id: genId('p'),
      patientNumber: allocatePatientNumber(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    // optimistic local
    setData((prev) => ({ ...prev, patients: [patient, ...prev.patients] }))
    setTimeout(() => addAudit({ recordId: patient.id, recordType: 'Patient', action: 'Created', userId: user?.id ?? 'current', userName: user?.email ?? 'Current User', details: patient.name }), 0)

    if (usingSupabase && supabase && workspaceId) {
      // insert with the SAME client-generated uuid, so linked records created
      // in the same flow (e.g. an OT) reference a valid, stable id
      const dbRow = mapPatientToDb({ ...patient, workspace_id: workspaceId, patient_number: patient.patientNumber, created_by: user?.id ?? null } as never)
      const { ...rest } = dbRow as Record<string, unknown>
      const sb = supabase
      const insertPatient = (payload: Record<string, unknown>, withoutIntake = false, attempt = 0): void => {
        sb
          .from('patients')
          .insert(payload as never)
          .select('*')
          .single()
          .then(({ data: row, error }) => {
            if (!error && row) {
              const mapped = mapPatientFromDb(row as Record<string, unknown>)
              // replace optimistic with real DB row (real uuid)
              setData((prev) => ({ ...prev, patients: prev.patients.map((x) => (x.id === patient.id ? mapped : x)) }))
            } else if (
              error &&
              !withoutIntake &&
              /chief_complaint|referred_by|tests_available|column/i.test(error.message ?? '')
            ) {
              // intake columns not migrated yet — retry without them so the
              // patient is still saved; run the migration to keep these fields
              const { chief_complaint: _cc, referred_by: _rb, tests_available: _ta, ...legacy } = payload
              insertPatient(legacy, true, attempt)
            } else if (error && error.code === '23505' && attempt < 5) {
              // Patient number already taken in this workspace (another device,
              // or a concurrent insert). Retry with the next free number rather
              // than dropping the record — the row used to vanish silently.
              const nextNumber = allocatePatientNumber()
              setData((prev) => ({ ...prev, patients: prev.patients.map((x) => (x.id === patient.id ? { ...x, patientNumber: nextNumber } : x)) }))
              insertPatient({ ...payload, patient_number: nextNumber }, withoutIntake, attempt + 1)
            } else if (error) {
              console.error('Failed to save patient', error)
              setSaveError('We could not save this patient. Please try again.')
            }
          })
      }
      insertPatient(rest)
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
      if (patch.chiefComplaint !== undefined) dbPatch.chief_complaint = patch.chiefComplaint || null
      if (patch.referredBy !== undefined) dbPatch.referred_by = patch.referredBy || null
      if (patch.testsAvailable !== undefined) dbPatch.tests_available = patch.testsAvailable ?? []
      dbPatch.updated_by = user?.id ?? null
      dbPatch.updated_at = new Date().toISOString()
      supabase.from('patients').update(dbPatch as never).eq('id', id).then(({ error }) => {
        if (error) {
          console.error(error)
          setSaveError('We could not save these patient details. Please try again.')
        }
      })
    }
  }

  const renameWorkspace: DataContextValue['renameWorkspace'] = async (name) => {
    const trimmed = name.trim()
    if (!trimmed || !usingSupabase || !supabase || !workspaceId) return { error: null }
    const { error } = await supabase
      .from('workspaces')
      .update({ name: trimmed })
      .eq('id', workspaceId)
    if (error) {
      console.error(error)
      return { error: friendlySaveError(error.message, 'the workspace name') }
    }
    return { error: null }
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
  const removeFacility: DataContextValue['removeFacility'] = async (id) => {
    if (usingSupabase && supabase) {
      const { error } = await supabase.from('facilities').delete().eq('id', id)
      if (error) {
        console.error(error)
        return { error: friendlySaveError(error.message, 'the facility') }
      }
    }
    setData((prev) => ({
      ...prev,
      facilities: prev.facilities.filter((facility) => facility.id !== id),
      patients: prev.patients.map((patient) => patient.primaryFacilityId === id ? { ...patient, primaryFacilityId: undefined } : patient),
      opdVisits: prev.opdVisits.map((visit) => visit.facilityId === id ? { ...visit, facilityId: '' } : visit),
      cancerEpisodes: prev.cancerEpisodes.map((episode) => episode.facilityId === id ? { ...episode, facilityId: undefined } : episode),
      operations: prev.operations.map((operation) => operation.facilityId === id ? { ...operation, facilityId: '' } : operation),
      followUps: prev.followUps.map((followUp) => followUp.facilityId === id ? { ...followUp, facilityId: undefined } : followUp),
      investigations: prev.investigations.map((investigation) => investigation.facilityId === id ? { ...investigation, facilityId: undefined } : investigation),
    }))
    return { error: null }
  }

  const addOpdVisit: DataContextValue['addOpdVisit'] = (v) => {
    const rec: OpdVisit = { ...v, id: genId('opd'), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), amendmentHistory: [] }
    setData((prev) => ({ ...prev, opdVisits: [rec, ...prev.opdVisits] }))
    if (usingSupabase && supabase && workspaceId) {
      const dbRow = mapOpdToDb({ ...rec, workspace_id: workspaceId })
      const { id: _id, ...rest } = dbRow as Record<string, unknown>
      supabase.from('opd_visits').insert({ ...rest, created_by: user?.id ?? null } as never).select('*').single().then(({ data: row, error }) => {
        if (!error && row) {
          const mapped = mapOpdFromDb(row as Record<string, unknown>)
          setData((prev) => ({ ...prev, opdVisits: prev.opdVisits.map((x) => (x.id === rec.id ? mapped : x)) }))
        } else if (error) {
          console.error(error)
          setSaveError('We could not save this visit note. Please try again.')
        }
      })
    }
    return rec
  }
  const updateOpdVisit: DataContextValue['updateOpdVisit'] = (id, patch) => {
    // Amending a finalised record must preserve the values it replaced,
    // otherwise the "amendment history" is an empty array and the change is a
    // silent overwrite.
    const existing = data.opdVisits.find((r) => r.id === id)
    const priorValues =
      existing && patch.amendmentHistory
        ? {
            chiefComplaint: existing.chiefComplaint,
            hpi: existing.hpi,
            assessment: existing.assessment,
            plan: existing.plan,
            investigations: existing.investigations,
            examination: existing.examination,
            status: existing.status,
          }
        : null
    const nextHistory =
      priorValues && patch.amendmentReason
        ? [
            ...(patch.amendmentHistory ?? []),
            {
              id: genId('amd'),
              recordId: id,
              recordType: 'OpdVisit',
              action: 'Amended',
              userId: user?.id ?? 'current',
              userName: user?.email ?? 'Current User',
              timestamp: new Date().toISOString(),
              reason: patch.amendmentReason,
              details: JSON.stringify(priorValues),
            },
          ]
        : patch.amendmentHistory
    setData((prev) => ({
      ...prev,
      opdVisits: prev.opdVisits.map((r) =>
        r.id === id ? { ...r, ...patch, amendmentHistory: nextHistory, updatedAt: new Date().toISOString() } : r,
      ),
    }))
    if (patch.amendmentReason) recordAmendment(id, 'OpdVisit', patch.amendmentReason, priorValues)
    if (usingSupabase && supabase) {
      const dbPatch: Record<string, unknown> = { updated_by: user?.id ?? null }
      if (patch.facilityId !== undefined) dbPatch.facility_id = patch.facilityId
      if (patch.visitDate !== undefined) dbPatch.visit_date = patch.visitDate
      if (patch.visitType !== undefined) dbPatch.visit_type = patch.visitType
      if (patch.chiefComplaint !== undefined) dbPatch.chief_complaint = patch.chiefComplaint
      if (patch.hpi !== undefined) dbPatch.hpi = patch.hpi || null
      if (patch.medicalHistory !== undefined) dbPatch.medical_history = patch.medicalHistory || null
      if (patch.surgicalHistory !== undefined) dbPatch.surgical_history = patch.surgicalHistory || null
      if (patch.medicationHistory !== undefined) dbPatch.medication_history = patch.medicationHistory || null
      if (patch.allergies !== undefined) dbPatch.allergies = patch.allergies || null
      if (patch.examination !== undefined) dbPatch.examination = patch.examination || null
      if (patch.oralExamination !== undefined) dbPatch.oral_examination = patch.oralExamination || null
      if (patch.neckExamination !== undefined) dbPatch.neck_examination = patch.neckExamination || null
      if (patch.assessment !== undefined) dbPatch.assessment = patch.assessment
      if (patch.plan !== undefined) dbPatch.plan = patch.plan
      if (patch.investigations !== undefined) dbPatch.investigations = patch.investigations || null
      if (patch.followUpDate !== undefined) dbPatch.follow_up_date = patch.followUpDate || null
      if (patch.clinician !== undefined) dbPatch.clinician = patch.clinician
      if (patch.status !== undefined) dbPatch.status = patch.status
      supabase.from('opd_visits').update(dbPatch as never).eq('id', id).then(({ error }) => {
        if (error) {
          console.error(error)
          setSaveError('We could not save this visit note. Please try again.')
        }
      })
    }
  }

  const addCancerEpisode: DataContextValue['addCancerEpisode'] = (e) => {
    // Episode numbers are year-scoped, e.g. CA-2026-011. The year was
    // hardcoded to 2024, so every episode created in 2026 was mislabelled.
    const year = new Date().getFullYear()
    const sameYear = data.cancerEpisodes.filter((c) => c.episodeId?.startsWith(`CA-${year}-`)).length
    const episodeId = `CA-${year}-${String(sameYear + 1).padStart(3, '0')}`
    const rec: CancerEpisode = { ...e, id: genId('ca'), episodeId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), amendmentHistory: [] }
    setData((prev) => ({ ...prev, cancerEpisodes: [rec, ...prev.cancerEpisodes] }))
    if (usingSupabase && supabase && workspaceId) {
      const dbRow = mapCancerToDb({ ...rec, workspace_id: workspaceId })
      const { id: _id, ...rest } = dbRow as Record<string, unknown>
      supabase.from('cancer_episodes').insert({ ...rest, created_by: user?.id ?? null } as never).select('*').single().then(({ data: row, error }) => {
        if (!error && row) {
          const mapped = mapCancerFromDb(row as Record<string, unknown>)
          setData((prev) => ({ ...prev, cancerEpisodes: prev.cancerEpisodes.map((x) => (x.id === rec.id ? mapped : x)) }))
        } else if (error) {
          console.error(error)
          setSaveError('We could not save this cancer episode. Please try again.')
        }
      })
    }
    return rec
  }
  const updateCancerEpisode: DataContextValue['updateCancerEpisode'] = (id, patch) => {
    const existing = data.cancerEpisodes.find((r) => r.id === id)
    const priorValues =
      existing && patch.amendmentHistory
        ? {
            primarySite: existing.primarySite,
            subsite: existing.subsite,
            laterality: existing.laterality,
            tCategory: existing.tCategory,
            nCategory: existing.nCategory,
            mCategory: existing.mCategory,
            stageGroup: existing.stageGroup,
            notes: existing.notes,
            status: existing.status,
          }
        : null
    const nextHistory =
      priorValues && patch.amendmentReason
        ? [
            ...(patch.amendmentHistory ?? []),
            {
              id: genId('amd'),
              recordId: id,
              recordType: 'CancerEpisode',
              action: 'Amended',
              userId: user?.id ?? 'current',
              userName: user?.email ?? 'Current User',
              timestamp: new Date().toISOString(),
              reason: patch.amendmentReason,
              details: JSON.stringify(priorValues),
            },
          ]
        : patch.amendmentHistory
    setData((prev) => ({
      ...prev,
      cancerEpisodes: prev.cancerEpisodes.map((r) =>
        r.id === id ? { ...r, ...patch, amendmentHistory: nextHistory, updatedAt: new Date().toISOString() } : r,
      ),
    }))
    if (patch.amendmentReason) recordAmendment(id, 'CancerEpisode', patch.amendmentReason, priorValues)
    if (usingSupabase && supabase) {
      const dbPatch: Record<string, unknown> = { updated_by: user?.id ?? null }
      if (patch.primarySite !== undefined) dbPatch.primary_site = patch.primarySite
      if (patch.subsite !== undefined) dbPatch.subsite = patch.subsite || null
      if (patch.laterality !== undefined) dbPatch.laterality = patch.laterality
      if (patch.diagnosisDate !== undefined) dbPatch.diagnosis_date = patch.diagnosisDate
      if (patch.histology !== undefined) dbPatch.histology = patch.histology || null
      if (patch.histologyGrade !== undefined) dbPatch.histology_grade = patch.histologyGrade || null
      if (patch.pathologyReportRef !== undefined) dbPatch.pathology_report_ref = patch.pathologyReportRef || null
      if (patch.stagingSystem !== undefined) dbPatch.staging_system = patch.stagingSystem || null
      if (patch.stagingEdition !== undefined) dbPatch.staging_edition = patch.stagingEdition || null
      if (patch.stageType !== undefined) dbPatch.stage_type = patch.stageType
      if (patch.tCategory !== undefined) dbPatch.t_category = patch.tCategory || null
      if (patch.nCategory !== undefined) dbPatch.n_category = patch.nCategory || null
      if (patch.mCategory !== undefined) dbPatch.m_category = patch.mCategory || null
      if (patch.stageGroup !== undefined) dbPatch.stage_group = patch.stageGroup || null
      if (patch.investigations !== undefined) dbPatch.investigations = patch.investigations || null
      if (patch.mdtDate !== undefined) dbPatch.mdt_date = patch.mdtDate || null
      if (patch.mdtNotes !== undefined) dbPatch.mdt_notes = patch.mdtNotes || null
      if (patch.treatmentHistory !== undefined) dbPatch.treatment_history = patch.treatmentHistory || null
      if (patch.facilityId !== undefined) dbPatch.facility_id = patch.facilityId || null
      if (patch.notes !== undefined) dbPatch.notes = patch.notes || null
      if (patch.status !== undefined) dbPatch.status = patch.status
      supabase.from('cancer_episodes').update(dbPatch as never).eq('id', id).then(({ error }) => {
        if (error) {
          console.error(error)
          setSaveError('We could not save these cancer registry details. Please try again.')
        }
      })
    }
  }

  const addOperation: DataContextValue['addOperation'] = (o) => {
    const rec: OperationRecord = { ...o, id: genId('ot'), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), amendmentHistory: [] }
    setData((prev) => ({ ...prev, operations: [rec, ...prev.operations] }))
    if (usingSupabase && supabase && workspaceId) {
      const dbRow = mapOtToDb({ ...rec, workspace_id: workspaceId })
      const { ...rest } = dbRow as Record<string, unknown>
      supabase.from('ot_records').insert({ ...rest, created_by: user?.id ?? null } as never).select('*').single().then(async ({ data: row, error }) => {
        if (!error && row) {
          const newId = ((row as Record<string, unknown>).id as string) || rec.id
          // insert child tables
          if (rec.procedures.length) {
            await supabase!.from('ot_procedures').insert(rec.procedures.map((p) => ({ ot_record_id: newId, procedure_name: p.name, site: p.site ?? null, laterality: p.laterality ?? null, details: p.details ?? null } as never)))
          }
          if (rec.assistants?.length) {
            await supabase!.from('ot_team_members').insert(rec.assistants.map((n) => ({ ot_record_id: newId, name: n, role: 'Assistant' as never })))
          }
          const mapped = mapOtFromDb(row as Record<string, unknown>, rec.procedures, rec.assistants ?? [])
          setData((prev) => ({ ...prev, operations: prev.operations.map((x) => (x.id === rec.id ? mapped : x)) }))
        } else if (error) {
          console.error(error)
          setSaveError('We could not save this operation. Please try again.')
        }
      })
    }
    return rec
  }
  const updateOperation: DataContextValue['updateOperation'] = (id, patch) => {
    const existing = data.operations.find((r) => r.id === id)
    const priorValues =
      existing && patch.amendmentHistory
        ? {
            procedures: existing.procedures.map((p) => p.name),
            preOpDiagnosis: existing.preOpDiagnosis,
            findings: existing.findings,
            plan: existing.plan,
            outcome: existing.outcome,
            complications: existing.complications,
            status: existing.status,
          }
        : null
    const nextHistory =
      priorValues && patch.amendmentReason
        ? [
            ...(patch.amendmentHistory ?? []),
            {
              id: genId('amd'),
              recordId: id,
              recordType: 'OperationRecord',
              action: 'Amended',
              userId: user?.id ?? 'current',
              userName: user?.email ?? 'Current User',
              timestamp: new Date().toISOString(),
              reason: patch.amendmentReason,
              details: JSON.stringify(priorValues),
            },
          ]
        : patch.amendmentHistory
    setData((prev) => ({
      ...prev,
      operations: prev.operations.map((r) =>
        r.id === id ? { ...r, ...patch, amendmentHistory: nextHistory, updatedAt: new Date().toISOString() } : r,
      ),
    }))
    if (patch.amendmentReason) recordAmendment(id, 'OperationRecord', patch.amendmentReason, priorValues)
    if (usingSupabase && supabase) {
      // Every editable field must be written back, not just the status —
      // otherwise an edit looked saved in the UI but never reached the
      // database and was lost on the next reload.
      const dbPatch: Record<string, unknown> = { updated_by: user?.id ?? null }
      if (patch.facilityId !== undefined) dbPatch.facility_id = patch.facilityId
      if (patch.operationDate !== undefined) dbPatch.procedure_date = patch.operationDate
      if (patch.electiveEmergency !== undefined) dbPatch.elective_emergency = patch.electiveEmergency
      if (patch.preOpDiagnosis !== undefined) dbPatch.pre_op_diagnosis = patch.preOpDiagnosis
      if (patch.postOpDiagnosis !== undefined) dbPatch.post_op_diagnosis = patch.postOpDiagnosis
      if (patch.primarySurgeon !== undefined) dbPatch.primary_surgeon = patch.primarySurgeon
      if (patch.anaesthesiaType !== undefined) dbPatch.anaesthesia_type = patch.anaesthesiaType
      if (patch.anaesthetist !== undefined) dbPatch.anaesthetist = patch.anaesthetist
      if (patch.findings !== undefined) dbPatch.findings = patch.findings
      if (patch.reconstruction !== undefined) dbPatch.reconstruction = patch.reconstruction
      if (patch.complications !== undefined) dbPatch.complications = patch.complications
      if (patch.outcome !== undefined) dbPatch.outcome = patch.outcome
      if (patch.plan !== undefined) dbPatch.plan = patch.plan
      if (patch.followUpDate !== undefined) dbPatch.follow_up_date = patch.followUpDate || null
      if (patch.cancerEpisodeId !== undefined) dbPatch.cancer_episode_id = patch.cancerEpisodeId || null
      if (patch.status !== undefined) dbPatch.status = patch.status
      supabase.from('ot_records').update(dbPatch as never).eq('id', id).then(async ({ error }) => {
        if (error) {
          console.error(error)
          setSaveError('We could not save these operation details. Please try again.')
          return
        }
        // procedures and team members live in child tables
        const sb = supabase!
        if (patch.procedures) {
          const { data: currentProcedures } = await sb.from('ot_procedures').select('id').eq('ot_record_id', id)
          const keep = (currentProcedures ?? []).map((r) => (r as Record<string, unknown>).id as string)
          if (keep.length) await sb.from('ot_procedures').delete().in('id', keep)
          if (patch.procedures.length) {
            await sb.from('ot_procedures').insert(patch.procedures.map((p) => ({ ot_record_id: id, procedure_name: p.name, site: p.site ?? null, laterality: p.laterality ?? null, details: p.details ?? null } as never)))
          }
        }
        if (patch.assistants) {
          const { data: currentTeam } = await sb.from('ot_team_members').select('id').eq('ot_record_id', id)
          const keep = (currentTeam ?? []).map((r) => (r as Record<string, unknown>).id as string)
          if (keep.length) await sb.from('ot_team_members').delete().in('id', keep)
          if (patch.assistants.length) {
            await sb.from('ot_team_members').insert(patch.assistants.map((n) => ({ ot_record_id: id, name: n, role: 'Assistant' as never })))
          }
        }
      })
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
        } else if (error) {
          console.error(error)
          setSaveError('We could not save this follow-up. Please try again.')
        }
      })
    }
    return rec
  }
  const updateFollowUp: DataContextValue['updateFollowUp'] = (id, patch) => {
    setData((prev) => ({ ...prev, followUps: prev.followUps.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r)) }))
    if (usingSupabase && supabase) {
      // The completion date is part of the clinical record — it must be
      // written back, along with every other edited field.
      const dbPatch: Record<string, unknown> = {}
      if (patch.status !== undefined) dbPatch.status = patch.status
      if (patch.dueDate !== undefined) dbPatch.due_date = patch.dueDate
      if (patch.completedDate !== undefined) dbPatch.completed_date = patch.completedDate || null
      if (patch.reason !== undefined) dbPatch.reason = patch.reason
      if (Object.prototype.hasOwnProperty.call(patch, 'paymentDue')) dbPatch.payment_due = patch.paymentDue ?? null
      if (patch.notes !== undefined) dbPatch.notes = patch.notes || null
      if (patch.facilityId !== undefined) dbPatch.facility_id = patch.facilityId || null
      if (patch.assignedTo !== undefined) dbPatch.assigned_to = patch.assignedTo || null
      if (patch.relatedId !== undefined) dbPatch.related_encounter_id = patch.relatedId || null
      if (patch.relatedType !== undefined) dbPatch.related_type = patch.relatedType || null
      if (Object.keys(dbPatch).length) supabase.from('follow_ups').update(dbPatch as never).eq('id', id).then(({ error }) => {
        if (error) {
          console.error(error)
          setSaveError('We could not save this follow-up. Please try again.')
        }
      })
    }
  }

  const addAssistant: DataContextValue['addAssistant'] = async (email, fullName) => {
    if (!isDoctor) return { error: 'Only the doctor can add an assistant.' }
    if (assistantInvite) return { error: 'You can add only one assistant.' }
    if (!email.trim() || !fullName.trim()) return { error: 'Please enter the assistant\u2019s name and email.' }
    const invite: AssistantInvite = { id: genId('asst'), email: email.trim().toLowerCase(), full_name: fullName.trim(), created_at: new Date().toISOString() }
    if (usingSupabase && supabase && workspaceId) {
      try {
        const { data: row, error } = await supabase.from('assistant_invites').insert({ workspace_id: workspaceId, email: invite.email, full_name: invite.full_name, invited_by: user?.id ?? null }).select('*').single()
        if (error) return { error: friendlySaveError(error.message, 'assistant') }
        setAssistantInvite(row as unknown as AssistantInvite)
        return { error: null }
      } catch {
        return { error: friendlySaveError('network', 'assistant') }
      }
    } else {
      // demo mode
      localStorage.setItem(ASSISTANT_KEY, JSON.stringify(invite))
      setAssistantInvite(invite)
      return { error: null }
    }
  }

  const removeAssistant: DataContextValue['removeAssistant'] = async () => {
    if (!isDoctor) return { error: 'Only the doctor can remove the assistant.' }
    if (!assistantInvite) return { error: null }
    if (usingSupabase && supabase && workspaceId) {
      try {
        const { error } = await supabase.from('assistant_invites').delete().eq('workspace_id', workspaceId)
        if (error) return { error: friendlySaveError(error.message, 'changes') }
        setAssistantInvite(null)
        return { error: null }
      } catch {
        return { error: friendlySaveError('network', 'changes') }
      }
    } else {
      localStorage.removeItem(ASSISTANT_KEY)
      setAssistantInvite(null)
      return { error: null }
    }
  }

  const resetDemo = () => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    localStorage.removeItem(ASSISTANT_KEY)
    setData({ ...initialData, auditEvents: [] })
    setAssistantInvite(null)
    // do not wipe Supabase; supabase reset requires manual SQL
  }

  /** Empty the patient list (keeps visits/records). */
  const clearPatients = async () => {
    setData((prev) => ({ ...prev, patients: [] }))
    if (usingSupabase && supabase && workspaceId) {
      // The list must actually leave the database, otherwise the patients
      // reappear on the next reload and the action silently did nothing.
      const { error } = await supabase.from('patients').delete().eq('workspace_id', workspaceId)
      if (error) {
        console.error(error)
        setSaveError('We could not clear the patient list. Please try again.')
        // put the list back so the UI matches the database
        const { data: remaining } = await supabase.from('patients').select('*').eq('workspace_id', workspaceId)
        setData((prev) => ({ ...prev, patients: (remaining ?? []).map((r) => mapPatientFromDb(r as Record<string, unknown>)) }))
      }
    }
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
    memberRole,
    saveError,
    clearSaveError: () => setSaveError(null),
    assistantInvite,
    addPatient,
    updatePatient,
    addFacility,
    updateFacility,
    removeFacility,
    renameWorkspace,
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
    clearPatients,
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
