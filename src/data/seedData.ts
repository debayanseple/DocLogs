import type { Facility } from '../types'

/**
 * Facilities seeded into a new workspace, and used as the local fallback when
 * the backend is not configured. The first three are active and are the ones
 * a new workspace starts with; the fourth is inactive and exists to exercise
 * the "inactive facilities are hidden from new record forms" rule.
 */
export const seedFacilities: Facility[] = [
  {
    id: 'f1',
    name: 'Park Street OPD Centre',
    facilityType: 'OPD Centre',
    address: '12B Park Street, Kolkata — 700016',
    contact: '+91 33 4001 2001',
    status: 'Active',
    notes: 'Primary consultation centre. Mon–Sat 10am–6pm.',
  },
  {
    id: 'f2',
    name: 'Salt Lake Multispecialty Hospital',
    facilityType: 'Hospital',
    address: 'Block DD, Sector 1, Salt Lake, Kolkata — 700064',
    contact: '+91 33 4002 3002',
    status: 'Active',
    notes: 'OT and inpatient facility. Head & Neck surgical unit.',
  },
  {
    id: 'f3',
    name: 'South Kolkata Clinic',
    facilityType: 'Clinic',
    address: '45 Deshapriya Park West, Kolkata — 700026',
    contact: '+91 33 4003 4003',
    status: 'Active',
    notes: 'Evening OPD — Tue, Thu, Sat 5pm–8pm.',
  },
  {
    id: 'f4',
    name: 'New Town Day Care Centre',
    facilityType: 'OPD Centre',
    address: 'Action Area I, New Town, Kolkata — 700156',
    contact: '+91 33 4004 5005',
    status: 'Inactive',
    notes: 'Temporarily closed for renovation.',
  },
]

/**
 * A workspace starts empty — no sample patients, visits or records. Only the
 * facility list is carried, so facility pickers and the workspace bootstrap
 * have something to work with.
 */
export const initialData = {
  facilities: seedFacilities,
  patients: [],
  opdVisits: [],
  cancerEpisodes: [],
  operations: [],
  followUps: [],
  investigations: [],
  pathology: [],
}
