# ClinicaLog OMFS — Prototype

A polished **frontend MVP** for **ClinicaLog OMFS**, a private clinical record and workflow app for an Oral & Maxillofacial Surgeon (OMFS) specialising in Head & Neck Oncology. Built with **React + TypeScript + Vite + Tailwind CSS + React Router + Lucide + Recharts**. Data is stored in a **mock repository layer** backed by `localStorage` for demo purposes — not secure for real patient data.

> **All patients and clinical data are synthetic.** Do not use this prototype for real clinical documentation.

---

## Tech stack

- React 19, TypeScript, Vite 8
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- React Router 7
- Lucide React icons
- Recharts (charts only where they add value)

No backend, database, auth provider, ORM or complex infra in this pass. Data access is behind a small `services/repository.tsx` layer so a secure backend can be connected later without rewriting the UI.

---

## Getting started

```bash
npm install
npm run dev      # start dev server (default http://localhost:5173)
npm run build    # type-check + production build
npm run preview  # preview the production build
```

Requires Node 18+.

---

## Demo roles (UI only)

Use the **role switcher** in the top bar (or Settings) to toggle:

- **Assistant** — can create/edit **Draft** and **Pending Review** records, cannot finalise or sign as the surgeon.
- **Surgeon (Dr. Arjun Sen)** — can review pending records and **Finalise**; can also create/edit.

This is a clearly labelled demo switcher. **Production RBAC must be enforced on the server.** Finalised records show status, author and amendment history; amendments preserve prior values (prototype simulation — not a legally reliable audit trail).

---

## What was built

### Navigation (10 routes)

- `/` — Dashboard
- `/patients` — Patient register (search, filter, pagination, add/edit, duplicate warning, CSV export)
- `/patients/:id` — Patient profile with unified chronological timeline across facilities + tabs (Overview / OPD / Cancer / Operations / Investigations / Follow-ups / Documents / Activity)
- `/opd` — OPD Register + add/edit form with draft → pending review → finalised → amended workflow
- `/cancer-registry` — Cancer episode register (site, subsite, laterality, staging system/edition, T/N/M, stage group) — fields are clinician-entered only, no inference
- `/ot` — OT / Operation register (multiple procedures & team members, facility, anaesthesia, specimens, outcome)
- `/follow-ups` — Worklist (Due/Upcoming/Overdue/Completed) with complete / reschedule / cancel + confirmation
- `/reports` — Date-range + facility filters, charts (OPD over time, operations by facility, cancer by site), follow-up counts, CSV exports
- `/facilities` — Facility list + add/edit (OPD Centre / Hospital / Clinic, Active/Inactive)
- `/settings` — Role switcher, profile, facility preference, JSON + CSV export, demo-data reset with confirmation, privacy notice

### Key product rules satisfied

- **One patient ID** across all facilities; encounters record their facility + date; patient timeline merges OPD, cancer, OT, investigations, follow-ups chronologically.
- Synthetic patients across **3 active facilities** (Park Street OPD, Salt Lake Hospital, South Kolkata Clinic) + linked records to demonstrate multi-facility workflows.
- Draft / Pending Review / Finalised / Amended lifecycle with role gating and amendment history.
- Clinical vs pathological staging distinguished; staging system + edition stored explicitly; no auto-calculation.
- CSV exports (patients, OPD, OT, cancer, follow-ups) with proper escaping; filtered exports in Reports.
- Global patient search in top bar; search/filter/sort everywhere.
- Persistent **Demo data** banner + prototype limitation footer.
- Responsive desktop-first layout with persistent sidebar (collapsible on mobile), cards/tables/tabs/badges/modals/drawers/empty states.

### Data model (`src/types/index.ts`)

`Patient`, `Facility`, `User`, `OpdVisit`, `CancerEpisode`, `Investigation`, `PathologyReport`, `OperationRecord`, `FollowUp`, `DocumentReference`, `AuditEvent`, `TimelineEvent`.

Relationships: patient → many OPD / cancer episodes / operations / follow-ups; each encounter → facility; cancer episode → investigations/pathology/MDT/treatment; operation → multiple procedures + team members + specimens.

### Project structure

```
src/
  app/App.tsx, router.tsx
  components/layout/ (Sidebar, Topbar, Layout)
  components/ui/ (Badge, Button, Card, Input, Modal)
  features/
    dashboard/
    patients/ (+ PatientForm, PatientDetails)
    opd/ (OpdRegister, OpdForm)
    cancer-registry/ (CancerRegistry, CancerForm)
    ot/ (OtRegister, OtForm)
    follow-ups/ (FollowUps, FollowUpForm)
    reports/
    facilities/
    settings/
  data/seedData.ts
  services/repository.tsx (mock repo + localStorage)
  services/role.tsx
  types/index.ts
  utils/csv.ts, dates.ts
```

---

## Commands run & result

- `npm install` — ok
- `npm install react-router-dom lucide-react recharts` — ok
- `npm install -D tailwindcss @tailwindcss/vite` — ok
- `npm run build` (`tsc -b && vite build`) — **passed** (852 kB bundle, gzip 241 kB; chunk-size warning is advisory)
- No test suite in template; manual route verification via build.

---

## Remaining / not in prototype

- No real backend, auth, RLS, tenant isolation, encryption, private document storage, or backup verification — all listed in Settings as required for production.
- No automatic staging, decision support, HIS/PACS integration, billing, or native apps (out of MVP scope).
- `localStorage` persistence is demo-only; do not use for clinical data.
- Charts use synthetic or filtered real counts; not a replacement for official registries.

---

## Running locally

```bash
npm run dev
# open http://localhost:5173
```

To reset synthetic data: **Settings → Reset demo dataset** (with confirmation) or clear `localStorage` key `clinicalog_demo_v1`.

---

*Built from `ClinicaLog_OMFS_OpenCode_Build_Prompt.md` + `ClinicaLog_OMFS_MVP_PRD.md`.*
