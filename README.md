# ClinicaLog OMFS

A private clinical record and workflow app for an Oral & Maxillofacial Surgeon (OMFS) specialising in Head & Neck Oncology. Built with **React 19 + TypeScript + Vite + Tailwind CSS v4 + React Router 7 + Lucide + Recharts**, backed by **Supabase** (Postgres + Auth + Row Level Security).

> **All patients and clinical data in this project are synthetic.** The app is not yet certified for real clinical documentation — see [Not production-ready](#not-production-ready).

---

## Tech stack

- React 19, TypeScript, Vite 8
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- React Router 7
- Lucide React icons
- Recharts (charts only where they add value)
- Supabase — Postgres, Auth (email + password), RLS, Storage (documents, not yet wired)

Data access sits behind a single `services/repository.tsx` layer, so the UI never talks to Supabase directly.

---

## Getting started

```bash
npm install
cp .env.example .env    # then fill in your Supabase project URL + publishable key
npm run dev             # http://localhost:5173
```

```bash
npm run build           # type-check + production build
npm run preview         # preview the production build
npm run lint            # oxlint
```

Requires Node 18+.

### Database setup

```bash
# 1. Apply the schema (creates all tables, indexes and RLS policies)
#    Supabase Dashboard → SQL Editor → paste supabase/schema.sql
#
# 2. Apply the migrations in order (each is idempotent)
#    supabase/migrations/20261015_patient_intake_fields.sql
#    supabase/migrations/20261022_workspace_bootstrap_rls.sql
#    supabase/migrations/20261022_enforce_client_invariants.sql
#    supabase/migrations/20261022_fix_rls_recursion.sql
#    supabase/migrations/20261104_follow_up_payment_due.sql
```

Email confirmation is on by default in Supabase. Until an address is confirmed, sign-in is refused — confirm users from **Authentication → Users**, or turn on auto-confirm for local development.

---

## Routes

| Route | Purpose |
|---|---|
| `/` | Dashboard — stat cards, OPD activity, cancer-by-site, upcoming follow-ups, recent activity |
| `/patients` | Patient register — search, facility filter, pagination, add/edit, duplicate warning, CSV import/export, clear list |
| `/patients/:id` | Patient profile — unified chronological timeline + tabs (Overview / OPD / Cancer / Operations / Investigations / Follow-ups / Documents / Activity) |
| `/follow-ups` | Worklist — All / Due / Upcoming / Overdue / Completed, with complete · reschedule · cancel + CSV export |
| `/reports` | Date-range + facility filters, activity charts, CSV exports for OPD / OT / cancer / follow-ups / patients |
| `/profile` | Profile, role, assistant management, facilities, preferences & data export |

`/opd`, `/ot`, `/cancer-registry`, `/facilities` and `/settings` are **legacy URLs** that redirect into the merged navigation above. The OPD, cancer and OT registers were folded into the patient profile; their search, filter and export capability lives in `/reports`.

---

## Roles

- **Doctor (Owner)** — owns the workspace, can add one assistant, finalise and amend records.
- **Assistant** — a member of the doctor's workspace. Can create and edit drafts; cannot finalise, cannot manage the assistant, cannot see workspace settings.

The role is read from `workspace_members.role` and enforced in the UI; the workspace boundary itself is enforced by RLS. A doctor invites an assistant by email from **Profile → Assistant**; when that person signs up with the invited address they join the doctor's workspace rather than creating one of their own.

---

## Data model (`src/types/index.ts`)

`Patient`, `Facility`, `User`, `OpdVisit`, `CancerEpisode`, `Investigation`, `PathologyReport`, `OperationRecord`, `FollowUp`, `DocumentReference`, `AuditEvent`, `TimelineEvent`.

Relationships: patient → many OPD / cancer episodes / operations / follow-ups; each encounter records its facility + date; cancer episode → investigations / pathology / MDT / treatment; operation → multiple procedures + team members + specimens.

### Project structure

```
src/
  app/App.tsx, router.tsx
  components/layout/ (Layout with sidebar + mobile tab bar)
  components/ui/ (Badge, Button, Card, Input, Modal, FilterChip, Skeleton)
  features/
    dashboard/
    patients/ (+ PatientForm, PatientDetails)
    opd/ (OpdForm)
    cancer-registry/ (CancerForm)
    ot/ (OtForm)
    follow-ups/ (FollowUps, FollowUpForm)
    reports/ (Reports)
    settings/ (Settings)
  lib/supabase.ts          # client + config flag
  services/
    auth.tsx               # Supabase auth session
    repository.tsx         # the only data-access layer
    role.tsx               # role derived from workspace_members
    supabaseMappers.ts     # snake_case DB rows <-> camelCase app types
  types/index.ts
  utils/csv.ts, dates.ts, errors.ts
supabase/
  schema.sql               # full schema + RLS policies
  migrations/              # incremental, idempotent fixes
```

---

## Key product rules

- **One patient ID** across all facilities; encounters record their facility + date; the patient timeline merges OPD, cancer, OT, investigations and follow-ups chronologically.
- Draft / Pending Review / Finalised / Amended lifecycle. Amending a finalised record asks for a reason and writes the replaced values to the audit log.
- Clinical vs pathological staging distinguished; staging system + edition stored explicitly; **no auto-calculation** — every field is clinician-entered.
- CSV export (patients, follow-ups) and CSV import of a patient list.
- Search and filter everywhere; persistent sidebar on desktop, bottom tab bar on mobile.
- Every write is optimistic locally but confirmed against the database — a failed write raises a visible banner rather than silently disappearing.

---

## Not production-ready

- The client talks to Supabase with the publishable key directly. RLS is the only server-side boundary; there is no API layer, no Edge Functions, no server-side validation.
- Document storage, encryption-at-rest, backup/restore, and audit-trail export for regulators are **not** implemented. The Documents tab is a placeholder.
- `created_by` / `updated_by` are recorded, but there is no legally reliable audit trail — the audit log is a convenience record, not a regulatory one.
- No HIPAA/DPDP compliance review, no data-processing agreements, no retention policy.
- Charts are derived from the workspace's own counts; they are not a substitute for an official cancer registry.

---

## Running locally

```bash
npm run dev
# open http://localhost:5173
```

Sign up with any address, then confirm it in **Supabase → Authentication → Users** (or enable auto-confirm).

---

*Built to `ClinicaLog_OMFS_MVP_PRD.md`.*
