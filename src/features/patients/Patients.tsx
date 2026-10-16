import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus, Download, Upload, Edit2, Eye, MoreVertical, Trash2 } from 'lucide-react'
import { useData } from '../../services/repository'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { FilterChip } from '../../components/ui/FilterChip'
import { Badge, StatusBadge } from '../../components/ui/Badge'
import { formatDate, calculateAge } from '../../utils/dates'
import { Modal } from '../../components/ui/Modal'
import { PatientForm, TEST_OPTIONS } from './PatientForm'
import { OtForm } from '../ot/OtForm'
import { exportToCsv } from '../../utils/csv'
import {
  SkeletonPage,
  SkeletonToolbar,
  SkeletonTable,
  SkeletonList,
  Skeleton,
} from '../../components/ui/Skeleton'
import type { Patient } from '../../types'

export function Patients() {
  const { data, addPatient, clearPatients, ready } = useData()
  const [q, setQ] = useState('')
  const [facility, setFacility] = useState('all')
  const [page, setPage] = useState(1)
  const [showAdd, setShowAdd] = useState(false)
  const [showAddOt, setShowAddOt] = useState(false)
  const [editing, setEditing] = useState<Patient | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const pageSize = 8

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  // derive last visit per patient
  const lastVisitMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const v of data.opdVisits) {
      const cur = m.get(v.patientId)
      if (!cur || new Date(v.visitDate) > new Date(cur)) m.set(v.patientId, v.visitDate)
    }
    for (const o of data.operations) {
      const cur = m.get(o.patientId)
      if (!cur || new Date(o.operationDate) > new Date(cur)) m.set(o.patientId, o.operationDate)
    }
    return m
  }, [data.opdVisits, data.operations])

  const opdIds = useMemo(() => new Set(data.opdVisits.map((v) => v.patientId)), [data.opdVisits])
  const otIds = useMemo(() => new Set(data.operations.map((o) => o.patientId)), [data.operations])

  const getSource = (pid: string): string[] => {
    const tags: string[] = []
    if (opdIds.has(pid)) tags.push('OPD')
    if (otIds.has(pid)) tags.push('OT')
    if (tags.length === 0) tags.push('New')
    return tags
  }

  const filtered = useMemo(() => {
    let list = [...data.patients]
    if (q.trim()) {
      const v = q.toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(v) ||
          p.patientNumber.toLowerCase().includes(v) ||
          (p.phone && p.phone.includes(v)),
      )
    }
    if (facility !== 'all') list = list.filter((p) => p.primaryFacilityId === facility)
    // newest registrations first
    return list.sort((a, b) => b.registrationDate.localeCompare(a.registrationDate))
  }, [data.patients, q, facility])

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))

  const facilityMap = new Map(data.facilities.map((f) => [f.id, f]))

  const handleExport = () => {
    const rows = filtered.map((p) => [p.patientNumber, p.name, p.dob ?? '', p.sex, p.phone, facilityMap.get(p.primaryFacilityId ?? '')?.name ?? '', getSource(p.id).join('+'), p.chiefComplaint ?? '', p.referredBy ?? '', (p.testsAvailable ?? []).join('; '), lastVisitMap.get(p.id) ? formatDate(lastVisitMap.get(p.id)) : '—', p.status])
    exportToCsv(`patients-${new Date().toISOString().slice(0, 10)}.csv`, ['Patient ID', 'Name', 'DOB', 'Sex', 'Phone', 'Facility', 'Source', 'Chief complaint', 'Referred by', 'Tests available', 'Last visit', 'Status'], rows)
    setMenuOpen(false)
  }

  // minimal RFC-4180 CSV row splitter (handles quoted commas/newlines)
  const parseCsv = (text: string): string[][] => {
    const rows: string[][] = []
    let row: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < text.length; i++) {
      const c = text[i]
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { cur += '"'; i++ } else inQuotes = false
        } else cur += c
      } else if (c === '"') inQuotes = true
      else if (c === ',') { row.push(cur); cur = '' }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = '' }
      else if (c !== '\r') cur += c
    }
    if (cur || row.length) { row.push(cur); rows.push(row) }
    return rows.filter((r) => r.some((x) => x.trim()))
  }

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text()
      const rows = parseCsv(text)
      if (rows.length < 2) { setImportMsg('No rows found in file.'); return }
      const header = rows[0].map((h) => h.trim().toLowerCase())
      const idx = (name: string) => header.findIndex((h) => h === name || h.includes(name))
      const iName = Math.max(idx('name'), 0)
      const iPhone = idx('phone')
      const iDob = idx('dob')
      const iAge = idx('age')
      const iSex = idx('sex')
      const iFac = idx('facility')
      const iChief = idx('chief')
      const iRef = header.findIndex((h) => h.includes('refer'))
      const iTests = header.findIndex((h) => h.includes('test'))
      const matchTests = (cell: string): string[] | undefined => {
        const wanted = cell.split(/[;|,]/).map((t) => t.trim().toLowerCase()).filter(Boolean)
        if (!wanted.length) return undefined
        const matched = TEST_OPTIONS.filter((opt) =>
          wanted.some((w) => opt.toLowerCase().includes(w) || w.includes(opt.toLowerCase().split(' (')[0])),
        )
        return matched.length ? matched : undefined
      }
      let added = 0
      for (const r of rows.slice(1)) {
        const name = (r[iName] ?? '').trim()
        if (!name) continue
        const facName = iFac >= 0 ? (r[iFac] ?? '').trim() : ''
        const fac = data.facilities.find((f) => f.name.toLowerCase() === facName.toLowerCase())
        const sexRaw = (iSex >= 0 ? (r[iSex] ?? '').trim() : '').toLowerCase()
        const sex: Patient['sex'] = sexRaw === 'male' ? 'Male' : sexRaw === 'female' ? 'Female' : sexRaw === 'other' ? 'Other' : 'Not recorded'
        addPatient({
          name,
          dob: iDob >= 0 ? (r[iDob] ?? '').trim() || undefined : undefined,
          age: iAge >= 0 && r[iAge] ? Number(r[iAge]) : undefined,
          sex,
          phone: iPhone >= 0 ? (r[iPhone] ?? '').trim() || undefined : undefined,
          registrationDate: new Date().toISOString().slice(0, 10),
          primaryFacilityId: fac?.id ?? data.facilities.find((f) => f.status === 'Active')?.id,
          status: 'Active',
          chiefComplaint: iChief >= 0 ? (r[iChief] ?? '').trim() || undefined : undefined,
          referredBy: iRef >= 0 ? (r[iRef] ?? '').trim() || undefined : undefined,
          testsAvailable: iTests >= 0 ? matchTests(r[iTests] ?? '') || undefined : undefined,
        })
        added++
      }
      setImportMsg(`Imported ${added} patient${added === 1 ? '' : 's'}.`)
    } catch {
      setImportMsg('Could not read file. Use a CSV with a Name column.')
    }
  }

  if (!ready) {
    return (
      <SkeletonPage>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Skeleton className="hidden sm:block h-9 w-9 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            </div>
            <Skeleton className="h-11 w-28 rounded-xl" />
          </div>
          <SkeletonToolbar chips={1} />
          <div className="hidden md:block">
            <SkeletonTable rows={8} cols={8} />
          </div>
          <div className="md:hidden">
            <SkeletonList rows={6} />
          </div>
        </div>
      </SkeletonPage>
    )
  }

  return (
    <div className="space-y-4">
      {/* Count + actions */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {filtered.length} of {data.patients.length} patients
        </p>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="primary" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add patient</span>
            <span className="sm:hidden">Patient</span>
          </Button>
          <Button variant="secondary" onClick={() => setShowAddOt(true)}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add OT</span>
            <span className="sm:hidden">OT</span>
          </Button>
        </div>
      </div>

      <Card className="!p-3">
        {/* Search on top — full width, compact height */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            size="sm"
            placeholder="Search name, ID or phone"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1) }}
            className="h-8 pl-8"
          />
        </div>

        {/* Facility filter + overflow menu */}
        <div className="flex items-center gap-1.5 mt-2.5">
          <FilterChip value={facility} onChange={(e) => { setFacility(e.target.value); setPage(1) }} aria-label="Filter by facility">
            <option value="all">All facilities</option>
            {data.facilities.filter((f) => f.status === 'Active').map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </FilterChip>

          <div className="relative ml-auto shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="h-8 w-8 rounded-xl text-slate-600 hover:bg-white/70 active:bg-white/85 bg-white/45 backdrop-blur-md border border-white/70 flex items-center justify-center"
              aria-label="More actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="glass-strong absolute right-0 mt-1.5 w-52 rounded-2xl py-1.5 z-30">
                <button onClick={handleExport} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-white/60 rounded-xl mx-1">
                  <Download className="w-4 h-4 text-slate-400" /> Export patient list
                </button>
                <button
                  onClick={() => { setMenuOpen(false); fileRef.current?.click() }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Upload className="w-4 h-4 text-slate-400" /> Import patient list
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleImportFile(f)
                    e.target.value = ''
                    setMenuOpen(false)
                  }}
                />
                <div className="px-3.5 py-1.5 text-[11px] text-slate-400 border-t border-white/60 mt-1">
                  Import expects a CSV with a Name column
                </div>
                <button
                  onClick={() => {
                    if (data.patients.length === 0) { setMenuOpen(false); return }
                    if (!confirm(`Remove all ${data.patients.length} patients from the list? Their visits and records will be kept.`)) return
                    clearPatients()
                    setMenuOpen(false)
                    setImportMsg('Patient list cleared.')
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl mx-1"
                >
                  <Trash2 className="w-4 h-4" /> Clear patient list
                </button>
              </div>
            )}
          </div>
        </div>

        {importMsg && (
          <div className="mt-2.5 text-xs px-3 py-2 rounded-xl glass-subtle text-slate-600 flex items-center justify-between">
            {importMsg}
            <button onClick={() => setImportMsg(null)} className="text-slate-400 hover:text-slate-600">×</button>
          </div>
        )}
      </Card>

      {/* Desktop table / Mobile cards */}
      <Card padding={false} className="overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/50 backdrop-blur-sm border-b border-white/70">
              <tr className="text-left text-slate-500">
                <th className="px-4 py-3 font-medium">Patient ID</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Facility</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Last visit</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500">No patients found.</td></tr>
              ) : paged.map((p) => (
                <tr key={p.id} className="hover:bg-white/50">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{p.patientNumber}</td>
                  <td className="px-4 py-3">
                    <Link to={`/patients/${p.id}`} className="font-medium text-[#162a4d] hover:underline">{p.name}</Link>
                    <div className="text-xs text-slate-500">{p.sex} · {p.dob ? `${calculateAge(p.dob) ?? p.age ?? '—'}y` : p.age ? `${p.age}y` : '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs">{p.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{facilityMap.get(p.primaryFacilityId ?? '')?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {getSource(p.id).map((s) => (
                        <Badge key={s} variant={s === 'OT' ? 'info' : s === 'OPD' ? 'success' : 'neutral'}>{s}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{lastVisitMap.get(p.id) ? formatDate(lastVisitMap.get(p.id)) : '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link to={`/patients/${p.id}`} className="p-1.5 rounded-lg hover:bg-white/60 active:bg-white/85 text-slate-500 min-w-[32px] min-h-[32px] flex items-center justify-center"><Eye className="w-4 h-4" /></Link>
                      <button onClick={() => setEditing(p)} className="p-1.5 rounded-lg hover:bg-white/60 active:bg-white/85 text-slate-500 min-w-[32px] min-h-[32px] flex items-center justify-center"><Edit2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: card list */}
        <div className="md:hidden divide-y divide-slate-100">
          {paged.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-slate-500">No patients found.</div>
          ) : paged.map((p) => (
            <Link key={p.id} to={`/patients/${p.id}`} className="flex items-start gap-3 p-4 active:bg-white/50">
              <div className="w-10 h-10 rounded-xl bg-[#162a4d] text-white flex items-center justify-center font-semibold text-xs shrink-0">
                {p.name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 truncate">{p.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{p.patientNumber}</div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <div className="text-xs text-slate-600 mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-mono">{p.phone ?? '—'}</span>
                  <span className="text-slate-400">·</span>
                  <span>{p.sex} · {p.dob ? `${calculateAge(p.dob) ?? p.age ?? '—'}y` : p.age ? `${p.age}y` : '—'}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1 truncate">
                  {facilityMap.get(p.primaryFacilityId ?? '')?.name ?? '—'}
                  {lastVisitMap.get(p.id) ? ` · Last ${formatDate(lastVisitMap.get(p.id))}` : ''}
                </div>
                <div className="flex gap-1 mt-1.5">
                  {getSource(p.id).map((s) => (
                    <Badge key={s} variant={s === 'OT' ? 'info' : s === 'OPD' ? 'success' : 'neutral'}>{s}</Badge>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-white/60 bg-white/40 backdrop-blur-sm">
          <div className="text-xs text-slate-500">Showing {paged.length} of {filtered.length}</div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
            <span className="px-3 py-1.5 text-sm text-slate-600">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
          </div>
        </div>
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add patient">
        <PatientForm onClose={() => setShowAdd(false)} />
      </Modal>
      <Modal open={showAddOt} onClose={() => setShowAddOt(false)} title="Add OT" widthClass="max-w-3xl">
        <OtForm onClose={() => setShowAddOt(false)} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit patient">
        {editing && <PatientForm patient={editing} onClose={() => setEditing(null)} />}
      </Modal>
    </div>
  )
}
