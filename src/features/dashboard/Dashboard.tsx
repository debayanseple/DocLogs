import { useState } from 'react'
import { Users, Stethoscope, FileText, Scissors, CalendarClock, AlertTriangle, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useData } from '../../services/repository'
import { Card, CardHeader } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { formatDate } from '../../utils/dates'
import { Modal } from '../../components/ui/Modal'
import { PatientForm } from '../patients/PatientForm'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { SkeletonPage, SkeletonStat, SkeletonCard, Skeleton } from '../../components/ui/Skeleton'

export function Dashboard() {
  const { data, ready } = useData()
  const [showAdd, setShowAdd] = useState(false)

  const totalPatients = data.patients.length
  const opdThisMonth = data.opdVisits.filter((v) => {
    const d = new Date(v.visitDate)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length
  const activeCancer = data.cancerEpisodes.filter((c) => c.status !== 'Finalised').length
  // also count total
  const cancerTotal = data.cancerEpisodes.length
  const opsThisMonth = data.operations.filter((o) => {
    const d = new Date(o.operationDate)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const dueFollowUps = data.followUps.filter((f) => f.status === 'Due' || f.status === 'Overdue').length
  const overdue = data.followUps.filter((f) => f.status === 'Overdue').length

  // upcoming follow-ups sorted
  const upcoming = [...data.followUps]
    .filter((f) => f.status !== 'Completed' && f.status !== 'Cancelled')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5)

  // recent activity: combine opd, ot, cancer sorted by updatedAt
  const recent = [
    ...data.opdVisits.map((v) => ({ id: v.id, type: 'OPD', date: v.updatedAt, title: `${v.chiefComplaint.slice(0, 60)}`, sub: v.status, patientId: v.patientId })),
    ...data.operations.map((o) => ({ id: o.id, type: 'OT', date: o.updatedAt, title: o.procedures[0]?.name ?? 'Operation', sub: o.status, patientId: o.patientId })),
    ...data.cancerEpisodes.map((c) => ({ id: c.id, type: 'Registry', date: c.updatedAt, title: `${c.primarySite} — ${c.stageGroup || 'Staging'}`, sub: c.status, patientId: c.patientId })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6)

  const patientMap = new Map(data.patients.map((p) => [p.id, p]))
  const facilityMap = new Map(data.facilities.map((f) => [f.id, f]))

  // charts: OPD visits last 6 months (synthetic)
  const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']
  const opdByMonth = months.map((m, idx) => {
    // generate deterministically from seed
    const counts: Record<string, number> = { Apr: 8, May: 11, Jun: 9, Jul: 14, Aug: 12, Sep: 16, Oct: 6 + opdThisMonth }
    return { month: m, visits: counts[m] ?? 5 + idx * 2 }
  })

  const cancerBySite = (() => {
    const agg: Record<string, number> = {}
    for (const c of data.cancerEpisodes) agg[c.primarySite] = (agg[c.primarySite] || 0) + 1
    return Object.entries(agg).map(([name, value]) => ({ name, value }))
  })()
  const COLORS = ['#162a4d', '#0d9488', '#f59e0b', '#64748b', '#e11d48']

  if (!ready) {
    return (
      <SkeletonPage>
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-32 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonStat key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <SkeletonCard className="lg:col-span-2 !p-5" />
            <SkeletonCard />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </SkeletonPage>
    )
  }

  return (
    <div className="space-y-6">
      {/* quick actions — Patients is now the single list (all merged) */}
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => setShowAdd(true)}><Users className="w-4 h-4" /> Add patient</Button>
        <Link to="/follow-ups"><Button variant="outline">Follow-ups <ArrowRight className="w-4 h-4" /></Button></Link>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center"><Users className="w-5 h-5 text-white" /></div>
            <div>
              <div className="text-2xl font-bold text-slate-900 leading-none">{totalPatients}</div>
              <div className="text-xs text-slate-500 mt-1">Total patients</div>
            </div>
          </div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center"><Stethoscope className="w-5 h-5 text-white" /></div>
            <div>
              <div className="text-2xl font-bold text-slate-900 leading-none">{opdThisMonth}</div>
              <div className="text-xs text-slate-500 mt-1">OPD this month</div>
            </div>
          </div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center"><FileText className="w-5 h-5 text-white" /></div>
            <div>
              <div className="text-2xl font-bold text-slate-900 leading-none">{cancerTotal}</div>
              <div className="text-xs text-slate-500 mt-1">{activeCancer} active</div>
              <div className="text-[11px] text-slate-400">Cancer registry</div>
            </div>
          </div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center"><Scissors className="w-5 h-5 text-white" /></div>
            <div>
              <div className="text-2xl font-bold text-slate-900 leading-none">{opsThisMonth}</div>
              <div className="text-xs text-slate-500 mt-1">Operations this month</div>
            </div>
          </div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center"><CalendarClock className="w-5 h-5 text-white" /></div>
            <div>
              <div className="text-2xl font-bold text-slate-900 leading-none">{dueFollowUps}</div>
              <div className="text-xs text-slate-500 mt-1">Follow-ups due</div>
            </div>
          </div>
        </Card>
        <Card className="!p-4 border-amber-200/60 bg-amber-100/40 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-white" /></div>
            <div>
              <div className="text-2xl font-bold text-red-700 leading-none">{overdue}</div>
              <div className="text-xs text-red-600 mt-1">Overdue</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="lg:col-span-2">
          <CardHeader title="OPD activity" subtitle="Visits per month (last 6 months)" />
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={opdByMonth}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="visits" fill="#162a4d" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Cancer registry" subtitle="Cases by primary site" />
          <div className="h-[220px] flex items-center justify-center">
            {cancerBySite.length === 0 ? (
              <div className="text-sm text-slate-500">No cases</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={cancerBySite} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3}>
                    {cancerBySite.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {cancerBySite.map((e, i) => (
              <span key={e.name} className="inline-flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /> {e.name} ({e.value})
              </span>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader title="Upcoming follow-ups" action={<Link to="/follow-ups" className="text-sm text-[#162a4d] font-medium hover:underline">View all</Link>} />
          {upcoming.length === 0 ? (
            <div className="text-sm text-slate-500 py-8 text-center">No upcoming follow-ups</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcoming.map((fu) => {
                const p = patientMap.get(fu.patientId)
                return (
                  <div key={fu.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{p?.name ?? '—'} <span className="text-slate-400 font-normal">· {p?.patientNumber}</span></div>
                      <div className="text-xs text-slate-500">{fu.reason} · {facilityMap.get(fu.facilityId ?? '')?.name ?? '—'} · {formatDate(fu.dueDate)}</div>
                    </div>
                    <StatusBadge status={fu.status} />
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Recent activity" subtitle="Latest updates across OPD, OT and registry" />
          <div className="space-y-3">
            {recent.map((r) => {
              const p = patientMap.get(r.patientId)
              return (
                <div key={`${r.type}-${r.id}`} className="flex gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${r.type === 'OPD' ? 'bg-teal-100 text-teal-700' : r.type === 'OT' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
                    {r.type === 'OPD' ? <Stethoscope className="w-4 h-4" /> : r.type === 'OT' ? <Scissors className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-slate-900 truncate">{r.title}</div>
                    <div className="text-xs text-slate-500">{p?.name} · {formatDate(r.date)} · <StatusBadge status={r.sub} /></div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add patient">
        <PatientForm onClose={() => setShowAdd(false)} />
      </Modal>
    </div>
  )
}
