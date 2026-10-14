import { useMemo, useState } from 'react'
import { useData } from '../../services/repository'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { StatusBadge } from '../../components/ui/Badge'
import { formatDateTime } from '../../utils/dates'
import { Modal } from '../../components/ui/Modal'
import { OpdForm } from './OpdForm'
import { exportToCsv } from '../../utils/csv'
import { Search, Plus, Download, Edit2 } from 'lucide-react'
import type { OpdVisit } from '../../types'

export function OpdRegister() {
  const { data } = useData()
  const [q, setQ] = useState('')
  const [facility, setFacility] = useState('all')
  const [status, setStatus] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<OpdVisit | null>(null)

  const patientMap = useMemo(() => new Map(data.patients.map((p) => [p.id, p])), [data.patients])
  const facilityMap = useMemo(() => new Map(data.facilities.map((f) => [f.id, f])), [data.facilities])

  const filtered = useMemo(() => {
    let list = [...data.opdVisits]
    if (q.trim()) {
      const v = q.toLowerCase()
      list = list.filter((r) => r.chiefComplaint.toLowerCase().includes(v) || patientMap.get(r.patientId)?.name.toLowerCase().includes(v) || r.id.toLowerCase().includes(v))
    }
    if (facility !== 'all') list = list.filter((r) => r.facilityId === facility)
    if (status !== 'all') list = list.filter((r) => r.status === status)
    return list.sort((a, b) => +new Date(b.visitDate) - +new Date(a.visitDate))
  }, [data.opdVisits, q, facility, status, patientMap])

  const handleExport = () => {
    const rows = filtered.map((v) => [v.id.slice(0, 8), formatDateTime(v.visitDate), patientMap.get(v.patientId)?.patientNumber ?? '', patientMap.get(v.patientId)?.name ?? '', facilityMap.get(v.facilityId)?.name ?? '', v.visitType, v.chiefComplaint, v.clinician, v.status])
    exportToCsv(`opd-${new Date().toISOString().slice(0, 10)}.csv`, ['Visit ID', 'Date', 'Patient ID', 'Patient', 'Facility', 'Visit type', 'Chief complaint', 'Clinician', 'Status'], rows)
  }

  return (
    <div className="space-y-4">
      <Card className="!p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search by patient, complaint or visit ID" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
          </div>
          <Select value={facility} onChange={(e) => setFacility(e.target.value)} className="w-[200px]">
            <option value="all">All facilities</option>
            {data.facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-[180px]">
            <option value="all">All statuses</option>
            <option value="Draft">Draft</option>
            <option value="Pending Review">Pending Review</option>
            <option value="Finalised">Finalised</option>
            <option value="Amended">Amended</option>
          </Select>
          <Button variant="outline" onClick={handleExport}><Download className="w-4 h-4" /> CSV</Button>
          <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> New visit</Button>
        </div>
        <div className="text-xs text-slate-500 mt-2">{filtered.length} visits</div>
      </Card>

      <Card padding={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/50 backdrop-blur-sm border-b border-white/70">
              <tr className="text-left text-slate-500">
                <th className="px-4 py-3 font-medium">Visit ID</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Patient</th>
                <th className="px-4 py-3 font-medium">Facility</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Chief complaint</th>
                <th className="px-4 py-3 font-medium">Clinician</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">No visits</td></tr> : filtered.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{v.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{formatDateTime(v.visitDate)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{patientMap.get(v.patientId)?.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{patientMap.get(v.patientId)?.patientNumber}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{facilityMap.get(v.facilityId)?.name}</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 bg-slate-100 rounded-full text-xs">{v.visitType}</span></td>
                  <td className="px-4 py-3 max-w-[260px] truncate text-slate-700" title={v.chiefComplaint}>{v.chiefComplaint}</td>
                  <td className="px-4 py-3 text-slate-600">{v.clinician}</td>
                  <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                  <td className="px-4 py-3"><button onClick={() => setEditing(v)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Edit2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New OPD visit" widthClass="max-w-3xl">
        <OpdForm onClose={() => setShowAdd(false)} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit OPD visit" widthClass="max-w-3xl">
        {editing && <OpdForm visit={editing} onClose={() => setEditing(null)} />}
      </Modal>
    </div>
  )
}
