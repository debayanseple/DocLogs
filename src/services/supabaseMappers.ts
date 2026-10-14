import type { Facility, Patient, OpdVisit, CancerEpisode, OperationRecord, FollowUp } from '../types'

// Patients
export function mapPatientToDb(p: Partial<Patient> & { workspace_id: string; patient_number: string }) {
  return {
    id: p.id,
    workspace_id: p.workspace_id,
    patient_number: p.patient_number,
    name: p.name,
    dob: p.dob || null,
    age: p.age ?? null,
    sex: p.sex,
    phone: p.phone ?? null,
    email: p.email ?? null,
    address: p.address ?? null,
    emergency_contact: p.emergencyContact ?? null,
    registration_date: p.registrationDate ?? new Date().toISOString().slice(0, 10),
    primary_facility_id: p.primaryFacilityId ?? null,
    status: p.status,
    notes: p.notes ?? null,
    allergies: p.allergies ?? null,
    medical_history: p.medicalHistory ?? null,
  }
}
export function mapPatientFromDb(r: Record<string, unknown>): Patient {
  return {
    id: r.id as string,
    patientNumber: r.patient_number as string,
    name: r.name as string,
    dob: (r.dob as string) ?? undefined,
    age: (r.age as number) ?? undefined,
    sex: (r.sex as Patient['sex']) ?? 'Not recorded',
    phone: (r.phone as string) ?? undefined,
    email: (r.email as string) ?? undefined,
    address: (r.address as string) ?? undefined,
    emergencyContact: (r.emergency_contact as string) ?? undefined,
    registrationDate: (r.registration_date as string) ?? (r.created_at as string)?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    primaryFacilityId: (r.primary_facility_id as string) ?? undefined,
    status: (r.status as Patient['status']) ?? 'Active',
    notes: (r.notes as string) ?? undefined,
    allergies: (r.allergies as string) ?? undefined,
    medicalHistory: (r.medical_history as string) ?? undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}

export function mapFacilityToDb(f: Partial<Facility> & { workspace_id: string }) {
  return {
    id: f.id,
    workspace_id: f.workspace_id,
    name: f.name,
    facility_type: f.facilityType,
    address: f.address ?? null,
    contact: f.contact ?? null,
    status: f.status,
    notes: f.notes ?? null,
  }
}
export function mapFacilityFromDb(r: Record<string, unknown>): Facility {
  return {
    id: r.id as string,
    name: r.name as string,
    facilityType: r.facility_type as Facility['facilityType'],
    address: (r.address as string) ?? '',
    contact: (r.contact as string) ?? undefined,
    status: (r.status as Facility['status']) ?? 'Active',
    notes: (r.notes as string) ?? undefined,
  }
}

export function mapOpdToDb(v: Partial<OpdVisit> & { workspace_id: string }) {
  return {
    id: v.id,
    workspace_id: v.workspace_id,
    patient_id: v.patientId,
    facility_id: v.facilityId ?? null,
    visit_date: v.visitDate,
    visit_type: v.visitType,
    chief_complaint: v.chiefComplaint,
    hpi: v.hpi ?? null,
    medical_history: v.medicalHistory ?? null,
    surgical_history: v.surgicalHistory ?? null,
    medication_history: v.medicationHistory ?? null,
    allergies: v.allergies ?? null,
    examination: v.examination ?? null,
    oral_examination: v.oralExamination ?? null,
    neck_examination: v.neckExamination ?? null,
    assessment: v.assessment ?? null,
    plan: v.plan ?? null,
    investigations: v.investigations ?? null,
    follow_up_date: v.followUpDate ?? null,
    clinician: v.clinician,
    status: v.status,
  }
}
export function mapOpdFromDb(r: Record<string, unknown>): OpdVisit {
  return {
    id: r.id as string,
    patientId: r.patient_id as string,
    facilityId: (r.facility_id as string) ?? '',
    visitDate: r.visit_date as string,
    visitType: r.visit_type as OpdVisit['visitType'],
    chiefComplaint: r.chief_complaint as string,
    hpi: (r.hpi as string) ?? undefined,
    medicalHistory: (r.medical_history as string) ?? undefined,
    surgicalHistory: (r.surgical_history as string) ?? undefined,
    medicationHistory: (r.medication_history as string) ?? undefined,
    allergies: (r.allergies as string) ?? undefined,
    examination: (r.examination as string) ?? undefined,
    oralExamination: (r.oral_examination as string) ?? undefined,
    neckExamination: (r.neck_examination as string) ?? undefined,
    assessment: (r.assessment as string) ?? undefined,
    plan: (r.plan as string) ?? undefined,
    investigations: (r.investigations as string) ?? undefined,
    followUpDate: (r.follow_up_date as string) ?? undefined,
    clinician: (r.clinician as string) ?? '',
    status: r.status as OpdVisit['status'],
    createdBy: (r.created_by as string) ?? '',
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    amendmentHistory: [],
  }
}

export function mapCancerToDb(e: Partial<CancerEpisode> & { workspace_id: string }) {
  return {
    id: e.id,
    workspace_id: e.workspace_id,
    patient_id: e.patientId,
    episode_id: e.episodeId,
    primary_site: e.primarySite,
    subsite: e.subsite ?? null,
    laterality: e.laterality,
    diagnosis_date: e.diagnosisDate,
    histology: e.histology ?? null,
    histology_grade: e.histologyGrade ?? null,
    pathology_report_ref: e.pathologyReportRef ?? null,
    staging_system: e.stagingSystem ?? null,
    staging_edition: e.stagingEdition ?? null,
    stage_type: e.stageType,
    t_category: e.tCategory ?? null,
    n_category: e.nCategory ?? null,
    m_category: e.mCategory ?? null,
    stage_group: e.stageGroup ?? null,
    investigations: e.investigations ?? null,
    mdt_date: e.mdtDate ?? null,
    mdt_notes: e.mdtNotes ?? null,
    treatment_history: e.treatmentHistory ?? null,
    status: e.status,
    facility_id: e.facilityId ?? null,
    notes: e.notes ?? null,
  }
}
export function mapCancerFromDb(r: Record<string, unknown>): CancerEpisode {
  return {
    id: r.id as string,
    patientId: r.patient_id as string,
    episodeId: r.episode_id as string,
    primarySite: r.primary_site as string,
    subsite: (r.subsite as string) ?? undefined,
    laterality: r.laterality as CancerEpisode['laterality'],
    diagnosisDate: r.diagnosis_date as string,
    histology: (r.histology as string) ?? undefined,
    histologyGrade: (r.histology_grade as string) ?? undefined,
    pathologyReportRef: (r.pathology_report_ref as string) ?? undefined,
    stagingSystem: (r.staging_system as string) ?? undefined,
    stagingEdition: (r.staging_edition as string) ?? undefined,
    stageType: r.stage_type as CancerEpisode['stageType'],
    tCategory: (r.t_category as string) ?? undefined,
    nCategory: (r.n_category as string) ?? undefined,
    mCategory: (r.m_category as string) ?? undefined,
    stageGroup: (r.stage_group as string) ?? undefined,
    investigations: (r.investigations as string) ?? undefined,
    mdtDate: (r.mdt_date as string) ?? undefined,
    mdtNotes: (r.mdt_notes as string) ?? undefined,
    treatmentHistory: (r.treatment_history as string) ?? undefined,
    status: r.status as CancerEpisode['status'],
    facilityId: (r.facility_id as string) ?? undefined,
    notes: (r.notes as string) ?? undefined,
    createdBy: (r.created_by as string) ?? '',
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    amendmentHistory: [],
  }
}

export function mapOtToDb(o: Partial<OperationRecord> & { workspace_id: string }) {
  return {
    id: o.id,
    workspace_id: o.workspace_id,
    patient_id: o.patientId,
    facility_id: o.facilityId ?? null,
    procedure_date: o.operationDate,
    elective_emergency: o.electiveEmergency ?? null,
    pre_op_diagnosis: o.preOpDiagnosis,
    post_op_diagnosis: o.postOpDiagnosis,
    primary_surgeon: o.primarySurgeon,
    anaesthesia_type: o.anaesthesiaType ?? null,
    anaesthetist: o.anaesthetist ?? null,
    findings: o.findings ?? null,
    reconstruction: o.reconstruction ?? null,
    complications: o.complications ?? null,
    outcome: o.outcome ?? null,
    plan: o.plan ?? null,
    follow_up_date: o.followUpDate ?? null,
    status: o.status,
    cancer_episode_id: o.cancerEpisodeId ?? null,
  }
}
export function mapOtFromDb(r: Record<string, unknown>, procedures: OperationRecord['procedures'] = [], assistants: string[] = []): OperationRecord {
  return {
    id: r.id as string,
    patientId: r.patient_id as string,
    facilityId: (r.facility_id as string) ?? '',
    operationDate: r.procedure_date as string,
    electiveEmergency: (r.elective_emergency as OperationRecord['electiveEmergency']) ?? undefined,
    preOpDiagnosis: r.pre_op_diagnosis as string,
    postOpDiagnosis: r.post_op_diagnosis as string,
    procedures,
    primarySurgeon: r.primary_surgeon as string,
    assistants,
    anaesthesiaType: (r.anaesthesia_type as OperationRecord['anaesthesiaType']) ?? undefined,
    anaesthetist: (r.anaesthetist as string) ?? undefined,
    findings: (r.findings as string) ?? undefined,
    reconstruction: (r.reconstruction as string) ?? undefined,
    complications: (r.complications as string) ?? undefined,
    outcome: (r.outcome as string) ?? undefined,
    plan: (r.plan as string) ?? undefined,
    followUpDate: (r.follow_up_date as string) ?? undefined,
    status: r.status as OperationRecord['status'],
    cancerEpisodeId: (r.cancer_episode_id as string) ?? undefined,
    createdBy: (r.created_by as string) ?? '',
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    amendmentHistory: [],
  }
}

export function mapFollowUpToDb(f: Partial<FollowUp> & { workspace_id: string }) {
  return {
    id: f.id,
    workspace_id: f.workspace_id,
    patient_id: f.patientId,
    related_encounter_id: f.relatedId ?? null,
    related_type: f.relatedType ?? null,
    due_date: f.dueDate,
    completed_date: f.completedDate ?? null,
    reason: f.reason,
    facility_id: f.facilityId ?? null,
    assigned_to: f.assignedTo ?? null,
    status: f.status,
    notes: f.notes ?? null,
  }
}
export function mapFollowUpFromDb(r: Record<string, unknown>): FollowUp {
  return {
    id: r.id as string,
    patientId: r.patient_id as string,
    relatedId: (r.related_encounter_id as string) ?? undefined,
    relatedType: (r.related_type as FollowUp['relatedType']) ?? undefined,
    dueDate: r.due_date as string,
    completedDate: (r.completed_date as string) ?? undefined,
    reason: r.reason as string,
    facilityId: (r.facility_id as string) ?? undefined,
    assignedTo: (r.assigned_to as string) ?? undefined,
    status: r.status as FollowUp['status'],
    notes: (r.notes as string) ?? undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}
