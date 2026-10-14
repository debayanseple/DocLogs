import { useMemo, useState } from 'react'
import { useData } from '../../services/repository'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { StatusBadge } from '../../components/ui/Badge'
import { formatDate } from '../../utils/dates'
import { exportToCsv } from '../../utils/csv'
import { Modal } from '../../components/ui/Modal'
import { FollowUpForm } from './FollowUpForm'
import { Plus, Download, Search, Edit2, Check, X, Calendar } from 'lucide-react'
import { FilterChip } from '../../components/ui/FilterChip'
import { SkeletonPage, SkeletonToolbar, SkeletonTable, SkeletonList, Skeleton } from '../../components/ui/Skeleton'

export function FollowUps() {
  const { data, updateFollowUp, ready } = useData()
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'all' | 'Due' | 'Upcoming' | 'Overdue' | 'Completed'>('all')
  const [facility, setFacility] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)

  const patientMap = useMemo(() => new Map(data.patients.map((p) => [p.id, p])), [data.patients])
  const facilityMap = useMemo(() => new Map(data.facilities.map((f) => [f.id, f])), [data.facilities])

  const filtered = useMemo(() => {
    let list = [...data.followUps]
    if (tab !== 'all') {
      // For Due tab, show Due + Overdue? But spec says tabs Due today, Upcoming, Overdue, Completed. We'll map.
      if (tab === 'Due') list = list.filter((f) => f.status === 'Due' || f.status === 'Overdue')
      else list = list.filter((f) => f.status === tab)
    }
    if (facility !== 'all') list = list.filter((f) => f.facilityId === facility)
    if (q.trim()) {
      const v = q.toLowerCase()
      list = list.filter((f) => f.reason.toLowerCase().includes(v) || patientMap.get(f.patientId)?.name.toLowerCase().includes(v))
    }
    return list.sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))
  }, [data.followUps, tab, facility, q, patientMap])

  const handleAction = (id: string, status: string, extra?: Partial<Record<string, string>>) => {
    if (!confirm(`Change status to ${status}?`)) return
    updateFollowUp(id, { status: status as never, ...extra, updatedAt: new Date().toISOString() } as never)
  }

  const handleExport = () => {
    const rows = filtered.map((f) => [f.id.slice(0, 8), patientMap.get(f.patientId)?.patientNumber ?? '', patientMap.get(f.patientId)?.name ?? '', f.reason, formatDate(f.dueDate), facilityMap.get(f.facilityId ?? '')?.name ?? '', f.assignedTo ?? '', f.status])
    exportToCsv(`followups-${new Date().toISOString().slice(0, 10)}.csv`, ['ID', 'Patient ID', 'Patient', 'Reason', 'Due date', 'Facility', 'Assigned', 'Status'], rows)
  }

  const counts = {
    Due: data.followUps.filter((f) => f.status === 'Due').length,
    Overdue: data.followUps.filter((f) => f.status === 'Overdue').length,
    Upcoming: data.followUps.filter((f) => f.status === 'Upcoming').length,
    Completed: data.followUps.filter((f) => f.status === 'Completed').length,
  }

  if (!ready) {
    return (
      <SkeletonPage>
        <div className="space-y-4">
          <SkeletonToolbar chips={1} />
          <div className="flex gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-full" />
            ))}
          </div>
          <div className="hidden md:block">
            <SkeletonTable rows={6} cols={7} />
          </div>
          <div className="md:hidden">
            <SkeletonList rows={5} />
          </div>
        </div>
      </SkeletonPage>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="!p-3">
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input size="sm" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} className="h-8 pl-8" />
          </div>
          <FilterChip value={facility} onChange={(e) => setFacility(e.target.value)} aria-label="Filter by facility">
            <option value="all">All facilities</option>
            {data.facilities.filter((f) => f.status === 'Active').map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </FilterChip>
          <Button size="sm" variant="outline" onClick={handleExport} className="shrink-0 px-2"><Download className="w-3.5 h-3.5" /><span className="sr-only sm:not-sr-only">CSV</span></Button>
          <Button size="sm" onClick={() => setShowAdd(true)} className="shrink-0 px-2.5"><Plus className="w-3.5 h-3.5" /><span className="sr-only sm:not-sr-only">New follow-up</span></Button>
        </div>
      </Card>

      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
        {(['all', 'Due', 'Upcoming', 'Overdue', 'Completed'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`h-8 px-3 rounded-full text-xs font-medium whitespace-nowrap border shrink-0 ${tab === t ? 'bg-[#162a4d] text-white border-[#162a4d]' : 'bg-white/55 backdrop-blur-md text-slate-600 border-white/70 hover:bg-white/75'}`}
          >
            {t === 'all' ? 'All' : t} {t !== 'all' ? `(${counts[t as keyof typeof counts]})` : `(${data.followUps.length})`}
          </button>
        ))}
      </div>

      <Card padding={false} className="overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/50 backdrop-blur-sm border-b border-white/70">
              <tr className="text-left text-slate-500">
                <th className="px-4 py-3 font-medium">Patient</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Due date</th>
                <th className="px-4 py-3 font-medium">Facility</th>
                <th className="px-4 py-3 font-medium">Assigned</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">No follow-ups in this view</td></tr> : filtered.map((f) => (
                <tr key={f.id} className="hover:bg-white/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{patientMap.get(f.patientId)?.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{patientMap.get(f.patientId)?.patientNumber}</div>
                  </td>
                  <td className="px-4 py-3 max-w-[260px] truncate" title={f.reason}>{f.reason}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" />{formatDate(f.dueDate)}</span>
                    {f.completedDate && <span className="text-xs text-slate-500 ml-2">Done {formatDate(f.completedDate)}</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{facilityMap.get(f.facilityId ?? '')?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{f.assignedTo ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={f.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {f.status !== 'Completed' && f.status !== 'Cancelled' && <button title="Complete" onClick={() => handleAction(f.id, 'Completed', { completedDate: new Date().toISOString().split('T')[0] })} className="p-1.5 rounded-lg hover:bg-emerald-50 active:bg-emerald-100 text-emerald-600 min-w-[32px] min-h-[32px] flex items-center justify-center"><Check className="w-4 h-4" /></button>}
                      {f.status !== 'Cancelled' && f.status !== 'Completed' && <button title="Cancel" onClick={() => handleAction(f.id, 'Cancelled')} className="p-1.5 rounded-lg hover:bg-red-50 active:bg-red-100 text-red-600 min-w-[32px] min-h-[32px] flex items-center justify-center"><X className="w-4 h-4" /></button>}
                      <button onClick={() => setEditing(f.id)} className="p-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-500 min-w-[36px] min-h-[36px] flex items-center justify-center"><Edit2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: card list */}
        <div className="md:hidden divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-slate-500">No follow-ups in this view</div>
          ) : filtered.map((f) => (
            <div key={f.id} className="p-4 active:bg-white/50">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 truncate">{patientMap.get(f.patientId)?.name}</div>
                  <div className="text-xs text-slate-500 font-mono">{patientMap.get(f.patientId)?.patientNumber}</div>
                </div>
                <StatusBadge status={f.status} />
              </div>
              <div className="text-sm text-slate-700 mt-1.5">{f.reason}</div>
              <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-2">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> {formatDate(f.dueDate)}
                </span>
                <span>· {facilityMap.get(f.facilityId ?? '')?.name ?? '—'}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2.5">
                {f.status !== 'Completed' && f.status !== 'Cancelled' && (
                  <Button size="sm" variant="outline" onClick={() => handleAction(f.id, 'Completed', { completedDate: new Date().toISOString().split('T')[0] })}>
                    <Check className="w-3.5 h-3.5" /> Complete
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setEditing(f.id)}>
                  <Edit2 className="w-3.5 h-3.5" /> Reschedule
                </Button>
                {f.status !== 'Cancelled' && f.status !== 'Completed' && (
                  <Button size="sm" variant="ghost" onClick={() => handleAction(f.id, 'Cancelled')}>
                    <X className="w-3.5 h-3.5" /> Cancel
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New follow-up">
        <FollowUpForm onClose={() => setShowAdd(false)} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit follow-up">
        {editing && (() => { const fu = data.followUps.find((x) => x.id === editing); return fu ? <FollowUpForm followUp={fu} onClose={() => setEditing(null)} /> : null })()}
      </Modal>
    </div>
  )
}
