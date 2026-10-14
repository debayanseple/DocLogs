export type RecordStatus = 'Draft' | 'Pending Review' | 'Finalised' | 'Amended'
export type FollowUpStatus = 'Due' | 'Upcoming' | 'Overdue' | 'Completed' | 'Cancelled' | 'Rescheduled'
export type FacilityType = 'OPD Centre' | 'Hospital' | 'Clinic'
export type FacilityStatus = 'Active' | 'Inactive'
export type PatientStatus = 'Active' | 'Inactive' | 'Archived'
export type Sex = 'Male' | 'Female' | 'Other' | 'Not recorded'
export type StageType = 'Clinical' | 'Pathological'
export type VisitType = 'New' | 'Follow-up' | 'Review' | 'Emergency'
export type Laterality = 'Left' | 'Right' | 'Bilateral' | 'Midline' | 'Not applicable' | 'Unknown'
export type AnaesthesiaType = 'General' | 'Local' | 'Regional' | 'Sedation' | 'Not recorded'

export interface User {
  id: string
  name: string
  role: 'Assistant' | 'Surgeon'
  email: string
  avatarInitials: string
}

export interface Facility {
  id: string
  name: string
  facilityType: FacilityType
  address: string
  contact?: string
  status: FacilityStatus
  notes?: string
}

export interface Patient {
  id: string
  patientNumber: string
  name: string
  dob?: string
  age?: number
  sex: Sex
  phone?: string
  email?: string
  address?: string
  emergencyContact?: string
  registrationDate: string
  primaryFacilityId?: string
  status: PatientStatus
  notes?: string
  allergies?: string
  medicalHistory?: string
  createdAt: string
  updatedAt: string
}

export interface OpdVisit {
  id: string
  patientId: string
  facilityId: string
  visitDate: string
  visitType: VisitType
  chiefComplaint: string
  hpi?: string
  medicalHistory?: string
  surgicalHistory?: string
  medicationHistory?: string
  allergies?: string
  examination?: string
  oralExamination?: string
  neckExamination?: string
  assessment?: string
  plan?: string
  investigations?: string
  followUpDate?: string
  clinician: string
  status: RecordStatus
  createdBy: string
  createdAt: string
  updatedAt: string
  amendmentHistory?: AuditEvent[]
}

export interface CancerEpisode {
  id: string
  patientId: string
  episodeId: string
  primarySite: string
  subsite?: string
  laterality: Laterality
  diagnosisDate: string
  histology?: string
  histologyGrade?: string
  pathologyReportRef?: string
  stagingSystem?: string
  stagingEdition?: string
  stageType: StageType
  tCategory?: string
  nCategory?: string
  mCategory?: string
  stageGroup?: string
  investigations?: string
  mdtDate?: string
  mdtNotes?: string
  treatmentHistory?: string
  status: RecordStatus
  facilityId?: string
  notes?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  amendmentHistory?: AuditEvent[]
}

export interface Investigation {
  id: string
  patientId: string
  type: string
  date: string
  summary: string
  reportReference?: string
  facilityId?: string
  status: RecordStatus
  documentId?: string
}

export interface PathologyReport {
  id: string
  patientId: string
  reportDate: string
  specimenSite: string
  histology: string
  grade?: string
  labName?: string
  reportId?: string
  findings?: string
  margins?: string
  pne?: string
  lve?: string
  ene?: string
  nodes?: string
  documentId?: string
}

export interface OperationRecord {
  id: string
  patientId: string
  facilityId: string
  operationDate: string
  electiveEmergency?: 'Elective' | 'Emergency'
  preOpDiagnosis: string
  postOpDiagnosis: string
  procedures: { name: string; site?: string; laterality?: Laterality; details?: string }[]
  primarySurgeon: string
  assistants?: string[]
  anaesthesiaType?: AnaesthesiaType
  anaesthetist?: string
  findings?: string
  reconstruction?: string
  specimens?: { id: string; site: string; pathologyRef?: string }[]
  complications?: string
  outcome?: string
  plan?: string
  followUpDate?: string
  status: RecordStatus
  cancerEpisodeId?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  amendmentHistory?: AuditEvent[]
}

export interface FollowUp {
  id: string
  patientId: string
  relatedId?: string
  relatedType?: 'OPD' | 'OT' | 'Cancer'
  dueDate: string
  completedDate?: string
  reason: string
  facilityId?: string
  assignedTo?: string
  status: FollowUpStatus
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface DocumentReference {
  id: string
  patientId: string
  relatedId?: string
  relatedType?: string
  fileName: string
  documentType: string
  storageKey: string
  uploadedAt: string
  uploadedBy: string
}

export interface AuditEvent {
  id: string
  recordId: string
  recordType: string
  action: string
  userId: string
  userName: string
  timestamp: string
  reason?: string
  details?: string
}

export interface TimelineEvent {
  id: string
  date: string
  type: 'OPD' | 'Cancer' | 'OT' | 'FollowUp' | 'Investigation' | 'Pathology'
  title: string
  description: string
  facilityId?: string
  facilityName?: string
  status: string
  recordId: string
  patientId: string
}
