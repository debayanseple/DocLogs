-- ClinicaLog OMFS — Supabase schema (MVP)
-- Run in Supabase Dashboard → SQL Editor (paste + Run)
-- Idempotent where possible. Requires pgcrypto for gen_random_uuid().

create extension if not exists "pgcrypto";

-- Workspaces (one per doctor, per PRD §7)
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  timezone text not null default 'Asia/Kolkata',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Workspace members (doctor + assistants)
create table if not exists workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','assistant')),
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- Facilities (OPD centres & hospitals)
create table if not exists facilities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  facility_type text not null check (facility_type in ('OPD Centre','Hospital','Clinic')),
  address text,
  contact text,
  status text not null default 'Active' check (status in ('Active','Inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_facilities_workspace on facilities(workspace_id);

-- Facility affiliations (doctor's association)
create table if not exists facility_affiliations (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references facilities(id) on delete cascade,
  start_date date,
  end_date date,
  status text not null default 'Active'
);

-- Patients (master record)
create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  patient_number text not null, -- e.g. CL-000124, unique per workspace
  name text not null,
  dob date,
  age int check (age >=0 and age <=120),
  sex text not null default 'Not recorded' check (sex in ('Male','Female','Other','Not recorded')),
  phone text,
  email text,
  address text,
  emergency_contact text,
  registration_date date not null default (now()::date),
  primary_facility_id uuid references facilities(id) on delete set null,
  status text not null default 'Active' check (status in ('Active','Inactive','Archived')),
  notes text,
  allergies text,
  medical_history text,
  chief_complaint text,
  referred_by text,
  tests_available text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  unique (workspace_id, patient_number)
);
create index if not exists idx_patients_workspace on patients(workspace_id);
create index if not exists idx_patients_name on patients using gin (to_tsvector('simple', name));
create index if not exists idx_patients_phone on patients(phone);

-- OPD visits
create table if not exists opd_visits (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  facility_id uuid references facilities(id) on delete set null,
  visit_date timestamptz not null,
  visit_type text not null check (visit_type in ('New','Follow-up','Review','Emergency')),
  chief_complaint text not null,
  hpi text,
  medical_history text,
  surgical_history text,
  medication_history text,
  allergies text,
  examination text,
  oral_examination text,
  neck_examination text,
  assessment text,
  plan text,
  investigations text,
  follow_up_date date,
  clinician text,
  status text not null default 'Draft' check (status in ('Draft','Pending Review','Finalised','Amended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);
create index if not exists idx_opd_patient on opd_visits(patient_id);
create index if not exists idx_opd_workspace on opd_visits(workspace_id);

-- Cancer episodes (longitudinal)
create table if not exists cancer_episodes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  episode_id text not null, -- human readable CA-2024-001 unique per workspace
  primary_site text not null,
  subsite text,
  laterality text not null default 'Unknown' check (laterality in ('Left','Right','Bilateral','Midline','Not applicable','Unknown')),
  diagnosis_date date not null,
  histology text,
  histology_grade text,
  pathology_report_ref text,
  staging_system text,
  staging_edition text,
  stage_type text not null default 'Clinical' check (stage_type in ('Clinical','Pathological')),
  t_category text,
  n_category text,
  m_category text,
  stage_group text,
  investigations text,
  mdt_date date,
  mdt_notes text,
  treatment_history text,
  status text not null default 'Draft' check (status in ('Draft','Pending Review','Finalised','Amended')),
  facility_id uuid references facilities(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  unique (workspace_id, episode_id)
);
create index if not exists idx_cancer_patient on cancer_episodes(patient_id);

-- Investigations
create table if not exists investigations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  investigation_type text not null,
  date date not null,
  result_summary text,
  report_reference text,
  facility_id uuid references facilities(id) on delete set null,
  status text not null default 'Finalised' check (status in ('Draft','Pending Review','Finalised','Amended')),
  document_id uuid,
  created_at timestamptz not null default now()
);

-- Pathology reports
create table if not exists pathology_reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  report_date date not null,
  specimen_site text not null,
  histology text not null,
  grade text,
  lab_name text,
  report_id text,
  findings text,
  margins text,
  pne text,
  lve text,
  ene text,
  nodes text,
  document_id uuid,
  created_at timestamptz not null default now()
);

-- OT records (operation header)
create table if not exists ot_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  facility_id uuid references facilities(id) on delete set null,
  procedure_date timestamptz not null,
  elective_emergency text check (elective_emergency in ('Elective','Emergency')),
  pre_op_diagnosis text not null,
  post_op_diagnosis text not null,
  primary_surgeon text not null,
  anaesthesia_type text check (anaesthesia_type in ('General','Local','Regional','Sedation','Not recorded')),
  anaesthetist text,
  findings text,
  reconstruction text,
  complications text,
  outcome text,
  plan text,
  follow_up_date date,
  status text not null default 'Draft' check (status in ('Draft','Pending Review','Finalised','Amended')),
  cancer_episode_id uuid references cancer_episodes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);
create index if not exists idx_ot_patient on ot_records(patient_id);

-- OT procedures (multiple per OT record)
create table if not exists ot_procedures (
  id uuid primary key default gen_random_uuid(),
  ot_record_id uuid not null references ot_records(id) on delete cascade,
  procedure_name text not null,
  site text,
  laterality text,
  details text
);
create index if not exists idx_ot_proc_record on ot_procedures(ot_record_id);

-- OT team members
create table if not exists ot_team_members (
  id uuid primary key default gen_random_uuid(),
  ot_record_id uuid not null references ot_records(id) on delete cascade,
  name text not null,
  role text not null default 'Assistant'
);
create index if not exists idx_ot_team_record on ot_team_members(ot_record_id);

-- Follow-ups
create table if not exists follow_ups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  related_encounter_id uuid,
  related_type text check (related_type in ('OPD','OT','Cancer')),
  due_date date not null,
  completed_date date,
  reason text not null,
  facility_id uuid references facilities(id) on delete set null,
  assigned_to text,
  status text not null default 'Upcoming' check (status in ('Due','Upcoming','Overdue','Completed','Cancelled','Rescheduled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_fu_patient on follow_ups(patient_id);
create index if not exists idx_fu_due on follow_ups(due_date);

-- Documents (private storage references)
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  record_id uuid,
  document_type text,
  storage_key text not null, -- Supabase Storage key
  file_name text,
  created_at timestamptz not null default now(),
  uploaded_by uuid references auth.users(id) on delete set null
);

-- Audit logs
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  record_id uuid,
  record_type text,
  action text not null,
  details text,
  timestamp timestamptz not null default now()
);
create index if not exists idx_audit_workspace on audit_logs(workspace_id);
create index if not exists idx_audit_record on audit_logs(record_id);

-- Consent records
create table if not exists consent_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  purpose text,
  notice_version text,
  status text,
  recorded_at timestamptz not null default now()
);

-- Subscriptions (billing, separate from clinical)
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade unique,
  plan text not null default 'Solo' check (plan in ('Solo','Surgeon Pro','Surgeon Plus')),
  status text not null default 'active',
  current_period_end date
);

-- Updated_at trigger
create or replace function update_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

drop trigger if exists trg_patients_updated on patients;
create trigger trg_patients_updated before update on patients for each row execute function update_updated_at();
drop trigger if exists trg_facilities_updated on facilities;
create trigger trg_facilities_updated before update on facilities for each row execute function update_updated_at();
drop trigger if exists trg_opd_updated on opd_visits;
create trigger trg_opd_updated before update on opd_visits for each row execute function update_updated_at();
drop trigger if exists trg_cancer_updated on cancer_episodes;
create trigger trg_cancer_updated before update on cancer_episodes for each row execute function update_updated_at();
drop trigger if exists trg_ot_updated on ot_records;
create trigger trg_ot_updated before update on ot_records for each row execute function update_updated_at();
drop trigger if exists trg_fu_updated on follow_ups;
create trigger trg_fu_updated before update on follow_ups for each row execute function update_updated_at();

-- RLS: enable and create policies (workspace isolation)
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table facilities enable row level security;
alter table patients enable row level security;
alter table opd_visits enable row level security;
alter table cancer_episodes enable row level security;
alter table investigations enable row level security;
alter table pathology_reports enable row level security;
alter table ot_records enable row level security;
alter table ot_procedures enable row level security;
alter table ot_team_members enable row level security;
alter table follow_ups enable row level security;
alter table documents enable row level security;
alter table audit_logs enable row level security;
alter table consent_records enable row level security;
alter table subscriptions enable row level security;

-- Helper: is member of workspace?
create or replace function is_workspace_member(w_id uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = w_id and user_id = auth.uid()
  );
$$;

-- Policies: allow member to read/write their workspace's rows
-- Workspaces
drop policy if exists "members can select workspaces" on workspaces;
create policy "members can select workspaces" on workspaces for select using (is_workspace_member(id));
drop policy if exists "authenticated can insert workspaces" on workspaces;
create policy "authenticated can insert workspaces" on workspaces for insert with check (auth.role() = 'authenticated');
drop policy if exists "owners can update workspaces" on workspaces;
create policy "owners can update workspaces" on workspaces for update using (owner_user_id = auth.uid());

-- Facilities
drop policy if exists "members manage facilities" on facilities;
create policy "members manage facilities" on facilities for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

-- Patients etc. (generic helper policies)
drop policy if exists "members manage patients" on patients;
create policy "members manage patients" on patients for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
drop policy if exists "members manage opd" on opd_visits;
create policy "members manage opd" on opd_visits for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
drop policy if exists "members manage cancer" on cancer_episodes;
create policy "members manage cancer" on cancer_episodes for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
drop policy if exists "members manage investigations" on investigations;
create policy "members manage investigations" on investigations for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
drop policy if exists "members manage pathology" on pathology_reports;
create policy "members manage pathology" on pathology_reports for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
drop policy if exists "members manage ot" on ot_records;
create policy "members manage ot" on ot_records for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
drop policy if exists "members manage followups" on follow_ups;
create policy "members manage followups" on follow_ups for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
drop policy if exists "members manage documents" on documents;
create policy "members manage documents" on documents for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
drop policy if exists "members manage audit" on audit_logs;
create policy "members manage audit" on audit_logs for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));
drop policy if exists "members manage consent" on consent_records;
create policy "members manage consent" on consent_records for all using (is_workspace_member(workspace_id)) with check (is_workspace_member(workspace_id));

-- OT child tables: inherit via parent workspace check through ot_records
drop policy if exists "members manage ot_procedures" on ot_procedures;
create policy "members manage ot_procedures" on ot_procedures for all using (
  exists (select 1 from ot_records r where r.id = ot_procedures.ot_record_id and is_workspace_member(r.workspace_id))
) with check (
  exists (select 1 from ot_records r where r.id = ot_procedures.ot_record_id and is_workspace_member(r.workspace_id))
);
drop policy if exists "members manage ot_team" on ot_team_members;
create policy "members manage ot_team" on ot_team_members for all using (
  exists (select 1 from ot_records r where r.id = ot_team_members.ot_record_id and is_workspace_member(r.workspace_id))
) with check (
  exists (select 1 from ot_records r where r.id = ot_team_members.ot_record_id and is_workspace_member(r.workspace_id))
);

-- workspace_members: user can read their own memberships; insert handled by backend/owner
drop policy if exists "users read own memberships" on workspace_members;
create policy "users read own memberships" on workspace_members for select using (user_id = auth.uid() or is_workspace_member(workspace_id));

-- Storage bucket for private documents (create in dashboard if not exists)
-- insert into storage.buckets (id, name, public) values ('clinical-docs','clinical-docs', false) on conflict do nothing;
