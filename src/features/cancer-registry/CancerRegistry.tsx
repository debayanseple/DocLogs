import { useMemo, useState } from 'react'
import { useData } from '../../services/repository'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { StatusBadge, Badge } from '../../components/ui/Badge'
import { formatDate } from '../../utils/dates'
import { Modal } from '../../components/ui/Modal'
import { CancerForm } from './CancerForm'
import { exportToCsv } from '../../utils/csv'
import { Search, Plus, Download, Edit2 } from 'lucide-react'
import type { CancerEpisode } from '../../types'

export function CancerRegistry() {
  const { data } = useData()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [site, setSite] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<CancerEpisode | null>(null)

  const patientMap = useMemo(() => new Map(data.patients.map((p) => [p.id, p])), [data.patients])
  const facilityMap = useMemo(() => new Map(data.facilities.map((f) => [f.id, f])), [data.facilities])

  const sites = useMemo(() => Array.from(new Set(data.cancerEpisodes.map((c) => c.primarySite))), [data.cancerEpisodes])

  const filtered = useMemo(() => {
    let list = [...data.cancerEpisodes]
    if (q.trim()) {
      const v = q.toLowerCase()
      list = list.filter((c) => c.primarySite.toLowerCase().includes(v) || c.episodeId.toLowerCase().includes(v) || c.histology?.toLowerCase().includes(v) || patientMap.get(c.patientId)?.name.toLowerCase().includes(v))
    }
    if (status !== 'all') list = list.filter((c) => c.status === status)
    if (site !== 'all') list = list.filter((c) => c.primarySite === site)
    return list.sort((a, b) => +new Date(b.diagnosisDate) - +new Date(a.diagnosisDate))
  }, [data.cancerEpisodes, q, status, site, patientMap])

  const handleExport = () => {
    const rows = filtered.map((c) => [c.episodeId, patientMap.get(c.patientId)?.patientNumber ?? '', patientMap.get(c.patientId)?.name ?? '', c.primarySite, c.subsite ?? '', c.laterality, formatDate(c.diagnosisDate), c.histology ?? '', `${c.stagingSystem ?? ''} ${c.stagingEdition ?? ''}`.trim(), c.stageType, c.tCategory ?? '', c.nCategory ?? '', c.mCategory ?? '', c.stageGroup ?? '', facilityMap.get(c.facilityId ?? '')?.name ?? '', c.status])
    exportToCsv(`cancer-registry-${new Date().toISOString().slice(0, 10)}.csv`, ['Episode ID', 'Patient ID', 'Patient', 'Primary site', 'Subsite', 'Laterality', 'Diagnosis date', 'Histology', 'Staging system', 'Stage type', 'T', 'N', 'M', 'Stage group', 'Facility', 'Status'], rows)
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
        <span className="font-medium">Clinical safety:</span> Registry stores clinician-entered diagnosis and stage. It does not calculate TNM or infer stage group. Keep system, edition and clinical/pathological designation explicit. Allow unknown values.
      </div>
      <Card className="!p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search by patient, site, histology or episode ID" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
          </div>
          <Select value={site} onChange={(e) => setSite(e.target.value)} className="w-full lg:w-[200px]">
            <option value="all">All sites</option>
            {sites.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full lg:w-[180px]">
            <option value="all">All statuses</option>
            <option value="Draft">Draft</option>
            <option value="Pending Review">Pending Review</option>
            <option value="Finalised">Finalised</option>
            <option value="Amended">Amended</option>
          </Select>
          <Button variant="outline" onClick={handleExport}><Download className="w-4 h-4" /> CSV</Button>
          <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> New episode</Button>
        </div>
        <div className="text-xs text-slate-500 mt-2">{filtered.length} episodes</div>
      </Card>

      <Card padding={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-white/50 backdrop-blur-sm border-b border-white/70">
              <tr className="text-left text-slate-500">
                <th className="px-4 py-3 font-medium">Episode ID</th>
                <th className="px-4 py-3 font-medium">Patient</th>
                <th className="px-4 py-3 font-medium">Site</th>
                <th className="px-4 py-3 font-medium">Diagnosis</th>
                <th className="px-4 py-3 font-medium">Histology</th>
                <th className="px-4 py-3 font-medium">Staging</th>
                <th className="px-4 py-3 font-medium">Facility</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">No episodes</td></tr> : filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs font-medium">{c.episodeId}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{patientMap.get(c.patientId)?.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{patientMap.get(c.patientId)?.patientNumber}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.primarySite}</div>
                    <div className="text-xs text-slate-500">{c.subsite ?? '—'} · {c.laterality}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(c.diagnosisDate)}</td>
                  <td className="px-4 py-3 max-w-[200px] truncate" title={c.histology}>{c.histology ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 items-center">
                      <Badge>{c.stagingSystem} {c.stagingEdition}</Badge>
                      <Badge>{c.stageType}</Badge>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">{[c.tCategory, c.nCategory, c.mCategory].filter(Boolean).join(' ') || '—'} {c.stageGroup ? `· ${c.stageGroup}` : ''}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{facilityMap.get(c.facilityId ?? '')?.name ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3"><button onClick={() => setEditing(c)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Edit2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New cancer episode" widthClass="max-w-3xl">
        <CancerForm onClose={() => setShowAdd(false)} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit cancer episode" widthClass="max-w-3xl">
        {editing && <CancerForm episode={editing} onClose={() => setEditing(null)} />}
      </Modal>
    </div>
  )
}
