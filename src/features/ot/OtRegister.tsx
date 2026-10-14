import { useMemo, useState } from 'react'
import { useData } from '../../services/repository'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { StatusBadge } from '../../components/ui/Badge'
import { formatDateTime } from '../../utils/dates'
import { Modal } from '../../components/ui/Modal'
import { OtForm } from './OtForm'
import { exportToCsv } from '../../utils/csv'
import { Search, Plus, Download, Edit2 } from 'lucide-react'
import type { OperationRecord } from '../../types'

export function OtRegister() {
  const { data } = useData()
  const [q, setQ] = useState('')
  const [facility, setFacility] = useState('all')
  const [status, setStatus] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<OperationRecord | null>(null)

  const patientMap = useMemo(() => new Map(data.patients.map((p) => [p.id, p])), [data.patients])
  const facilityMap = useMemo(() => new Map(data.facilities.map((f) => [f.id, f])), [data.facilities])

  const filtered = useMemo(() => {
    let list = [...data.operations]
    if (q.trim()) {
      const v = q.toLowerCase()
      list = list.filter((o) => o.procedures.some((p) => p.name.toLowerCase().includes(v)) || patientMap.get(o.patientId)?.name.toLowerCase().includes(v) || o.preOpDiagnosis.toLowerCase().includes(v))
    }
    if (facility !== 'all') list = list.filter((o) => o.facilityId === facility)
    if (status !== 'all') list = list.filter((o) => o.status === status)
    return list.sort((a, b) => +new Date(b.operationDate) - +new Date(a.operationDate))
  }, [data.operations, q, facility, status, patientMap])

  const handleExport = () => {
    const rows = filtered.map((o) => [o.id.slice(0, 8), formatDateTime(o.operationDate), patientMap.get(o.patientId)?.patientNumber ?? '', patientMap.get(o.patientId)?.name ?? '', facilityMap.get(o.facilityId)?.name ?? '', o.procedures.map((p) => p.name).join(' + '), o.primarySurgeon, o.preOpDiagnosis, o.postOpDiagnosis, o.status])
    exportToCsv(`ot-${new Date().toISOString().slice(0, 10)}.csv`, ['OT ID', 'Date', 'Patient ID', 'Patient', 'Facility', 'Procedure', 'Surgeon', 'Pre-op Dx', 'Post-op Dx', 'Status'], rows)
  }

  return (
    <div className="space-y-4">
      <Card className="!p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search by patient, procedure or diagnosis" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
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
          <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> New operation</Button>
        </div>
        <div className="text-xs text-slate-500 mt-2">{filtered.length} operations</div>
      </Card>

      <Card padding={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/50 backdrop-blur-sm border-b border-white/70">
              <tr className="text-left text-slate-500">
                <th className="px-4 py-3 font-medium">OT ID</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Patient</th>
                <th className="px-4 py-3 font-medium">Facility</th>
                <th className="px-4 py-3 font-medium">Procedure</th>
                <th className="px-4 py-3 font-medium">Surgeon</th>
                <th className="px-4 py-3 font-medium">Dx</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">No operations</td></tr> : filtered.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{o.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(o.operationDate)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{patientMap.get(o.patientId)?.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{patientMap.get(o.patientId)?.patientNumber}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{facilityMap.get(o.facilityId)?.name}</td>
                  <td className="px-4 py-3 max-w-[260px] truncate" title={o.procedures.map((p) => p.name).join(' + ')}>{o.procedures.map((p) => p.name).join(' + ')}</td>
                  <td className="px-4 py-3 text-slate-600">{o.primarySurgeon}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">{o.preOpDiagnosis}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3"><button onClick={() => setEditing(o)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Edit2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New operation" widthClass="max-w-3xl">
        <OtForm onClose={() => setShowAdd(false)} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit operation" widthClass="max-w-3xl">
        {editing && <OtForm op={editing} onClose={() => setEditing(null)} />}
      </Modal>
    </div>
  )
}
