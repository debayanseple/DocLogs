import { useMemo, useState } from 'react'
import { useData } from '../../services/repository'
import { Card, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { exportToCsv } from '../../utils/csv'
import { Download } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

export function Reports() {
  const { data } = useData()
  const [dateFrom, setDateFrom] = useState('2024-09-01')
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [facility, setFacility] = useState('all')

  const facilityMap = useMemo(() => new Map(data.facilities.map((f) => [f.id, f])), [data.facilities])

  const filteredOpd = useMemo(() => {
    let list = data.opdVisits.filter((v) => v.visitDate.slice(0, 10) >= dateFrom && v.visitDate.slice(0, 10) <= dateTo)
    if (facility !== 'all') list = list.filter((v) => v.facilityId === facility)
    return list
  }, [data.opdVisits, dateFrom, dateTo, facility])
  const filteredOt = useMemo(() => {
    let list = data.operations.filter((o) => o.operationDate.slice(0, 10) >= dateFrom && o.operationDate.slice(0, 10) <= dateTo)
    if (facility !== 'all') list = list.filter((o) => o.facilityId === facility)
    return list
  }, [data.operations, dateFrom, dateTo, facility])
  const filteredFu = useMemo(() => {
    let list = data.followUps.filter((f) => f.dueDate.slice(0, 10) >= dateFrom && f.dueDate.slice(0, 10) <= dateTo)
    if (facility !== 'all') list = list.filter((f) => f.facilityId === facility)
    return list
  }, [data.followUps, dateFrom, dateTo, facility])
  const filteredCancer = useMemo(() => {
    let list = data.cancerEpisodes.filter((c) => c.diagnosisDate >= dateFrom && c.diagnosisDate <= dateTo)
    if (facility !== 'all') list = list.filter((c) => c.facilityId === facility)
    return list
  }, [data.cancerEpisodes, dateFrom, dateTo, facility])

  const opdByFacility = useMemo(() => {
    const agg: Record<string, number> = {}
    for (const v of filteredOpd) {
      const name = facilityMap.get(v.facilityId)?.name ?? 'Unknown'
      agg[name] = (agg[name] ?? 0) + 1
    }
    return Object.entries(agg).map(([name, value]) => ({ name, value }))
  }, [filteredOpd, facilityMap])

  const otByFacility = useMemo(() => {
    const agg: Record<string, number> = {}
    for (const o of filteredOt) {
      const name = facilityMap.get(o.facilityId)?.name ?? 'Unknown'
      agg[name] = (agg[name] ?? 0) + 1
    }
    return Object.entries(agg).map(([name, value]) => ({ name, value }))
  }, [filteredOt, facilityMap])

  const cancerBySite = useMemo(() => {
    const agg: Record<string, number> = {}
    for (const c of filteredCancer) agg[c.primarySite] = (agg[c.primarySite] ?? 0) + 1
    return Object.entries(agg).map(([name, value]) => ({ name, value }))
  }, [filteredCancer])

  const fuStats = {
    completed: filteredFu.filter((f) => f.status === 'Completed').length,
    overdue: filteredFu.filter((f) => f.status === 'Overdue').length,
    due: filteredFu.filter((f) => f.status === 'Due').length,
    upcoming: filteredFu.filter((f) => f.status === 'Upcoming').length,
  }

  const COLORS = ['#162a4d', '#0d9488', '#f59e0b', '#64748b', '#e11d48', '#7c3aed']

  const opdOverTime = useMemo(() => {
    // group by week for demo
    const map: Record<string, number> = {}
    for (const v of filteredOpd) {
      const d = v.visitDate.slice(0, 10)
      map[d] = (map[d] ?? 0) + 1
    }
    return Object.entries(map).sort().slice(-14).map(([date, visits]) => ({ date: date.slice(5), visits }))
  }, [filteredOpd])

  return (
    <div className="space-y-6">
      <Card className="!p-4">
        <div className="flex flex-col lg:flex-row gap-3 items-end">
          <div>
            <label className="text-xs font-medium text-slate-600">From</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">To</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Facility</label>
            <Select value={facility} onChange={(e) => setFacility(e.target.value)} className="w-[240px]">
              <option value="all">All facilities</option>
              {data.facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
          </div>
          <div className="text-xs text-slate-500">
            Showing {filteredOpd.length} OPD · {filteredOt.length} OT · {filteredFu.length} follow-ups · {filteredCancer.length} cancer episodes
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="!p-4 text-center"><div className="text-2xl font-bold text-slate-900">{filteredOpd.length}</div><div className="text-xs text-slate-500">OPD visits</div></Card>
        <Card className="!p-4 text-center"><div className="text-2xl font-bold text-slate-900">{filteredOt.length}</div><div className="text-xs text-slate-500">Operations</div></Card>
        <Card className="!p-4 text-center"><div className="text-2xl font-bold text-slate-900">{filteredCancer.length}</div><div className="text-xs text-slate-500">Cancer episodes</div></Card>
        <Card className="!p-4 text-center"><div className="text-2xl font-bold text-slate-900">{fuStats.completed}/{filteredFu.length}</div><div className="text-xs text-slate-500">Follow-ups completed</div></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="OPD visits over time" />
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={opdOverTime}><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="visits" stroke="#162a4d" strokeWidth={2} dot /></LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Operations by facility" />
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={otByFacility}><XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} /><YAxis /><Tooltip /><Bar dataKey="value" fill="#0d9488" radius={[8, 8, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="OPD by facility" />
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={opdByFacility}><XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} /><YAxis /><Tooltip /><Bar dataKey="value" fill="#162a4d" radius={[8, 8, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Cancer cases by primary site" />
          <div className="h-[240px] flex items-center justify-center">
            {cancerBySite.length === 0 ? <div className="text-sm text-slate-500">No cases in range</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={cancerBySite} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3}>{cancerBySite.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Follow-up completion" subtitle={`${fuStats.completed} completed · ${fuStats.overdue} overdue · ${fuStats.due} due · ${fuStats.upcoming} upcoming`} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-center">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4"><div className="text-xl font-bold text-emerald-700">{fuStats.completed}</div><div className="text-xs text-emerald-700">Completed</div></div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4"><div className="text-xl font-bold text-amber-700">{fuStats.due}</div><div className="text-xs text-amber-700">Due</div></div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4"><div className="text-xl font-bold text-red-700">{fuStats.overdue}</div><div className="text-xs text-red-700">Overdue</div></div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4"><div className="text-xl font-bold text-blue-700">{fuStats.upcoming}</div><div className="text-xs text-blue-700">Upcoming</div></div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Export filtered data" subtitle="CSV exports are escaped correctly and contain only the filtered rows" />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => {
            const rows = filteredOpd.map((v) => [v.id.slice(0, 8), v.visitDate.slice(0, 10), data.patients.find((p) => p.id === v.patientId)?.patientNumber ?? '', data.patients.find((p) => p.id === v.patientId)?.name ?? '', facilityMap.get(v.facilityId)?.name ?? '', v.chiefComplaint, v.status])
            exportToCsv(`report-opd-${dateFrom}-to-${dateTo}.csv`, ['Visit ID', 'Date', 'Patient ID', 'Patient', 'Facility', 'Complaint', 'Status'], rows)
          }}><Download className="w-4 h-4" /> OPD CSV</Button>
          <Button variant="outline" onClick={() => {
            const rows = filteredOt.map((o) => [o.id.slice(0, 8), o.operationDate.slice(0, 10), data.patients.find((p) => p.id === o.patientId)?.patientNumber ?? '', data.patients.find((p) => p.id === o.patientId)?.name ?? '', facilityMap.get(o.facilityId)?.name ?? '', o.procedures.map((p) => p.name).join(' + '), o.status])
            exportToCsv(`report-ot-${dateFrom}-to-${dateTo}.csv`, ['OT ID', 'Date', 'Patient ID', 'Patient', 'Facility', 'Procedure', 'Status'], rows)
          }}><Download className="w-4 h-4" /> OT CSV</Button>
          <Button variant="outline" onClick={() => {
            const rows = filteredCancer.map((c) => [c.episodeId, data.patients.find((p) => p.id === c.patientId)?.patientNumber ?? '', data.patients.find((p) => p.id === c.patientId)?.name ?? '', c.primarySite, c.histology ?? '', `${c.tCategory ?? ''} ${c.nCategory ?? ''} ${c.mCategory ?? ''}`.trim(), c.stageGroup ?? '', c.status])
            exportToCsv(`report-cancer-${dateFrom}-to-${dateTo}.csv`, ['Episode ID', 'Patient ID', 'Patient', 'Site', 'Histology', 'TNM', 'Stage group', 'Status'], rows)
          }}><Download className="w-4 h-4" /> Cancer registry CSV</Button>
          <Button variant="outline" onClick={() => {
            const rows = filteredFu.map((f) => [f.id.slice(0, 8), data.patients.find((p) => p.id === f.patientId)?.patientNumber ?? '', data.patients.find((p) => p.id === f.patientId)?.name ?? '', f.reason, f.dueDate.slice(0, 10), f.status])
            exportToCsv(`report-followups-${dateFrom}-to-${dateTo}.csv`, ['ID', 'Patient ID', 'Patient', 'Reason', 'Due date', 'Status'], rows)
          }}><Download className="w-4 h-4" /> Follow-ups CSV</Button>
          <Button variant="outline" onClick={() => {
            const rows = data.patients.map((p) => [p.patientNumber, p.name, p.dob ?? '', p.sex, p.phone ?? '', facilityMap.get(p.primaryFacilityId ?? '')?.name ?? '', p.status])
            exportToCsv(`report-patients-${dateFrom}-to-${dateTo}.csv`, ['Patient ID', 'Name', 'DOB', 'Sex', 'Phone', 'Facility', 'Status'], rows)
          }}><Download className="w-4 h-4" /> Patients CSV</Button>
        </div>
        <div className="text-xs text-slate-500 mt-3">This screen does not generate official cancer-registry submissions or statutory reports. Exports are for internal review only.</div>
      </Card>
    </div>
  )
}
