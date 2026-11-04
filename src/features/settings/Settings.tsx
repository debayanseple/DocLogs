import { useData } from '../../services/repository'
import { useRole } from '../../services/role'
import { useAuth } from '../../services/auth'
import { Card, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea, Field } from '../../components/ui/Input'
import { StatusBadge } from '../../components/ui/Badge'
import { exportToCsv } from '../../utils/csv'
import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { ChevronDown, Building2, Plus, Edit2, MapPin, Phone, Trash2 } from 'lucide-react'
import type { Facility } from '../../types'
import { SkeletonPage, Skeleton, SkeletonCard } from '../../components/ui/Skeleton'

export function Settings() {
  const { data, resetDemo, usingSupabase, addFacility, updateFacility, removeFacility, renameWorkspace, ready } = useData()
  const { role } = useRole()
  const { user, profileName, signOut, updateProfile } = useAuth()
  const [showReset, setShowReset] = useState(false)
  const [showTechnical, setShowTechnical] = useState(false)
  const [facilityPref, setFacilityPref] = useState(data.facilities.find((f) => f.status === 'Active')?.id ?? '')
  const [showAddFac, setShowAddFac] = useState(false)
  const [editingFac, setEditingFac] = useState<Facility | null>(null)
  const [facForm, setFacForm] = useState<Partial<Facility>>({ name: '', facilityType: 'OPD Centre', address: '', contact: '', status: 'Active', notes: '' })
  const [deletingFacilityId, setDeletingFacilityId] = useState<string | null>(null)
  const [facilityDeleteError, setFacilityDeleteError] = useState<string | null>(null)

  const displayName = profileName || user?.email?.split('@')[0] || (role === 'Surgeon' ? 'Dr. Arjun Sen' : 'Priya Das')
  const displayEmail = user?.email || (role === 'Surgeon' ? 'arjun.sen@clinicalog.app' : 'priya.das@clinicalog.app')
  const initials = displayName
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const isSignedIn = !!user
  const { isDoctor, assistantInvite, addAssistant, removeAssistant } = useData()
  const [assName, setAssName] = useState('')
  const [assEmail, setAssEmail] = useState('')
  const [assBusy, setAssBusy] = useState(false)
  const [assError, setAssError] = useState<string | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)
  const currentRoleLabel = isDoctor ? 'Doctor (Owner)' : 'Assistant'

  // ── Your details (name + sign-in email) ──────────────────────────────
  const [detailsName, setDetailsName] = useState(profileName ?? '')
  const [detailsEmail, setDetailsEmail] = useState(user?.email ?? '')
  const [detailsPassword, setDetailsPassword] = useState('')
  const [detailsBusy, setDetailsBusy] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [detailsNotice, setDetailsNotice] = useState<string | null>(null)
  const [detailsPendingEmail, setDetailsPendingEmail] = useState<string | null>(null)

  const emailChanged = detailsEmail.trim().toLowerCase() !== (user?.email ?? '').trim().toLowerCase()
  const detailsDirty =
    detailsName.trim() !== (profileName ?? '').trim() || emailChanged

  const resetDetails = () => {
    setDetailsName(profileName ?? '')
    setDetailsEmail(user?.email ?? '')
    setDetailsPassword('')
    setDetailsError(null)
    setDetailsNotice(null)
  }

  const handleSaveDetails = async () => {
    if (!isSignedIn) {
      setDetailsError('Sign in to update your details.')
      return
    }
    setDetailsBusy(true)
    setDetailsError(null)
    setDetailsNotice(null)
    try {
      const { error, pendingEmail } = await updateProfile({
        fullName: detailsName.trim(),
        email: detailsEmail.trim(),
        currentPassword: detailsPassword,
      })
      if (error) {
        setDetailsError(error)
        return
      }
      setDetailsPassword('')
      if (pendingEmail) {
        setDetailsPendingEmail(pendingEmail)
        setDetailsNotice(
          `We sent a confirmation link to ${pendingEmail}. Your sign-in email changes once you open it.`,
        )
      } else if (detailsName.trim() !== (profileName ?? '').trim()) {
        setDetailsNotice('Your name has been updated.')
      }
      // The workspace follows its owner, so the sidebar label stays correct.
      if (isDoctor) {
        const renamed = await renameWorkspace(`${detailsName.trim()} Workspace`)
        if (renamed.error) {
          setDetailsError(
            `Your details were saved, but the workspace label could not be updated: ${renamed.error}`,
          )
        }
      }
    } catch {
      setDetailsError('Something went wrong. Please try again.')
    } finally {
      setDetailsBusy(false)
    }
  }

  const handleExportAll = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clinicalog-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleReset = () => {
    resetDemo()
    setShowReset(false)
  }

  const openAddFac = () => { setFacForm({ name: '', facilityType: 'OPD Centre', address: '', contact: '', status: 'Active', notes: '' }); setShowAddFac(true) }
  const openEditFac = (f: Facility) => { setFacForm({ ...f }); setEditingFac(f) }
  const handleSaveFac = () => {
    if (!facForm.name?.trim() || !facForm.address?.trim()) { alert('Name and address required'); return }
    if (editingFac) { updateFacility(editingFac.id, facForm as Partial<Facility>); setEditingFac(null) }
    else { addFacility({ name: facForm.name!.trim(), facilityType: facForm.facilityType as Facility['facilityType'], address: facForm.address!.trim(), contact: facForm.contact, status: facForm.status as Facility['status'], notes: facForm.notes }); setShowAddFac(false) }
  }
  const handleDeleteFacility = async (facility: Facility) => {
    if (!confirm(`Delete ${facility.name}? Existing records will be kept, but their facility assignment will be removed.`)) return
    setFacilityDeleteError(null)
    setDeletingFacilityId(facility.id)
    const result = await removeFacility(facility.id)
    setDeletingFacilityId(null)
    if (result.error) {
      setFacilityDeleteError(result.error)
      return
    }
    if (facilityPref === facility.id) {
      setFacilityPref(data.facilities.find((item) => item.id !== facility.id && item.status === 'Active')?.id ?? '')
    }
  }

  if (!ready) {
    return (
      <SkeletonPage>
        <div className="space-y-6 max-w-3xl">
          <div className="glass rounded-2xl p-5 flex gap-4">
            <Skeleton className="h-14 w-14 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
              <Skeleton className="h-2.5 w-32" />
            </div>
          </div>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <Skeleton className="h-12 w-full rounded-2xl" />
        </div>
      </SkeletonPage>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader title="Profile" subtitle={isSignedIn ? 'Your workspace profile' : 'Profile'} />
        <div className="flex gap-4">
          <div className="w-14 h-14 shrink-0 rounded-2xl bg-[#162a4d] text-white flex items-center justify-center font-bold text-lg">{initials}</div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-slate-900 truncate">{displayName}</div>
            <div className="text-sm text-slate-600 break-all">{displayEmail}</div>
            <div className="text-xs text-slate-500 mt-1">OMFS — Head & Neck Oncology · Kolkata · {role}</div>
            {isSignedIn && <div className="text-xs text-slate-500 mt-1">Signed in — your data is private to this account.</div>}
            {isSignedIn && (
              <div className="mt-3">
                <Button variant="outline" size="sm" onClick={() => signOut()}>Sign out</Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Your details"
          subtitle="Your name is shown on records you create. Your email is how you sign in."
        />
        <div className="space-y-3 max-w-md">
          <Field label="Full name">
            <Input
              value={detailsName}
              onChange={(e) => setDetailsName(e.target.value)}
              placeholder="Dr. Arjun Sen"
              autoComplete="name"
            />
          </Field>
          <Field
            label="Sign-in email"
            hint={detailsPendingEmail ? `Waiting for confirmation on ${detailsPendingEmail}` : undefined}
          >
            <Input
              type="email"
              value={detailsEmail}
              onChange={(e) => setDetailsEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </Field>
          {emailChanged && (
            <Field label="Current password" hint="Required to change the sign-in email">
              <Input
                type="password"
                value={detailsPassword}
                onChange={(e) => setDetailsPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </Field>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              onClick={handleSaveDetails}
              disabled={detailsBusy || !detailsDirty}
            >
              {detailsBusy ? 'Saving…' : 'Save changes'}
            </Button>
            {detailsDirty && (
              <Button variant="ghost" onClick={resetDetails} disabled={detailsBusy}>
                Cancel
              </Button>
            )}
          </div>
          {detailsError && (
            <div role="alert" className="text-sm p-2 rounded-lg border border-red-200 bg-red-50 text-red-700">
              {detailsError}
            </div>
          )}
          {detailsNotice && (
            <div role="status" className="text-sm p-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700">
              {detailsNotice}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Role" subtitle="Fixed — cannot be changed. Doctor is primary holder." />
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-slate-600">Your role:</span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${isDoctor ? 'bg-[#162a4d] text-white' : 'bg-teal-600 text-white'}`}>{currentRoleLabel}</span>
          <span className="text-xs text-slate-500">{isDoctor ? 'Can add 1 assistant' : 'Assistant — limited permissions'}</span>
        </div>
        <div className="mt-3 text-xs text-slate-600 bg-white/55 backdrop-blur-md border border-white/70 rounded-lg p-3">
          <div><span className="font-medium">Doctor:</span> primary account holder, can add one assistant, finalise records.</div>
          <div className="mt-1"><span className="font-medium">Assistant:</span> can create/edit drafts, cannot finalise or change roles.</div>
          <div className="text-xs text-slate-500 mt-2">Roles are fixed after account creation.</div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Assistant" subtitle={isDoctor ? 'Doctor can add one assistant' : 'Only doctor can manage assistant'} />
        {assistantInvite ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 glass-subtle rounded-xl p-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900 truncate">{assistantInvite.full_name}</div>
                <div className="text-xs text-slate-600">{assistantInvite.email}</div>
                <div className="text-xs text-slate-400 mt-1">Added · {new Date(assistantInvite.created_at).toLocaleDateString()}</div>
              </div>
              {isDoctor ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={removing}
                  onClick={async () => {
                    if (!confirm('Remove this assistant? They will lose access to your workspace.')) return
                    setRemoveError(null)
                    setRemoving(true)
                    const r = await removeAssistant()
                    setRemoving(false)
                    if (r.error) setRemoveError(r.error)
                  }}
                >
                  {removing ? 'Removing…' : 'Remove'}
                </Button>
              ) : (
                <span className="text-xs text-slate-500">Managed by doctor</span>
              )}
            </div>
            {removeError && <div className="text-xs text-red-600 bg-red-100/50 backdrop-blur-md border border-red-200/60 rounded-lg p-2">{removeError}</div>}
          </div>
        ) : isDoctor ? (
          <div className="space-y-3">
            <div className="text-sm text-slate-600">No assistant added yet. You can add <span className="font-medium">one</span> assistant.</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Assistant full name" required><Input value={assName} onChange={(e) => setAssName(e.target.value)} placeholder="Priya Das" /></Field>
              <Field label="Assistant email" required><Input type="email" value={assEmail} onChange={(e) => setAssEmail(e.target.value)} placeholder="assistant@example.com" /></Field>
            </div>
            {assError && <div className="text-xs text-red-600 bg-red-100/50 backdrop-blur-md border border-red-200/60 rounded-lg p-2">{assError}</div>}
            <Button
              onClick={async () => {
                setAssError(null)
                if (!assName.trim() || !assEmail.trim()) { setAssError('Please enter the assistant\u2019s name and email.'); return }
                setAssBusy(true)
                const { error } = await addAssistant(assEmail, assName)
                setAssBusy(false)
                if (error) setAssError(error)
                else { setAssName(''); setAssEmail('') }
              }}
              disabled={assBusy}
            >
              {assBusy ? 'Adding…' : 'Add assistant — 1 only'}
            </Button>
            <div className="text-xs text-slate-500">Assistant will sign up with this email and be linked to your workspace.</div>
          </div>
        ) : (
          <div className="text-sm text-slate-500 bg-amber-100/50 backdrop-blur-md border border-amber-200/60 rounded-lg p-3">Only the doctor can add an assistant. You are signed in as assistant.</div>
        )}
      </Card>

      <Card>
        <CardHeader title="Facilities" subtitle="Hospitals and OPD centres — merged from Facilities menu" action={<Button size="sm" onClick={openAddFac}><Plus className="w-4 h-4" /> Add facility</Button>} />
        {facilityDeleteError && <div role="alert" className="text-sm p-2 mb-3 rounded-lg border border-red-200 bg-red-50 text-red-700">{facilityDeleteError}</div>}
        {data.facilities.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">No facilities yet. Add a hospital, clinic, or OPD centre.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.facilities.map((f) => (
            <div key={f.id} className="glass-subtle rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex gap-2 items-center">
                  <div className="w-8 h-8 rounded-lg bg-[#162a4d] flex items-center justify-center shrink-0"><Building2 className="w-4 h-4 text-white" /></div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">{f.name}</div>
                    <div className="text-xs bg-white/60 backdrop-blur-sm border border-white/70 rounded-full px-2 py-0.5 inline-block mt-0.5">{f.facilityType}</div>
                  </div>
                </div>
                <StatusBadge status={f.status} />
              </div>
              <div className="text-xs text-slate-600 mt-2 flex gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" /><span>{f.address}</span></div>
              {f.contact && <div className="text-xs text-slate-600 mt-1 flex gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />{f.contact}</div>}
              <div className="mt-2 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => openEditFac(f)}><Edit2 className="w-3.5 h-3.5" /> Edit</Button>
                <Button variant="danger" size="sm" disabled={deletingFacilityId !== null} onClick={() => handleDeleteFacility(f)}>
                  <Trash2 className="w-3.5 h-3.5" /> {deletingFacilityId === f.id ? 'Deleting…' : 'Delete'}
                </Button>
              </div>
            </div>
            ))}
          </div>
        )}
      </Card>

      {/* Preferences & data at bottom */}
      <div className="glass rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowTechnical(!showTechnical)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-slate-700 hover:bg-white/50"
        >
          <span>Preferences & data</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showTechnical ? 'rotate-180' : ''}`} />
        </button>
        {showTechnical && (
          <div className="border-t border-white/60 p-5 space-y-6 bg-white/35 backdrop-blur-sm">

            <div className="glass-subtle rounded-xl p-4">
              <div className="text-sm font-semibold text-slate-900 mb-3">Preferences</div>
              <div>
                <label className="text-sm font-medium text-slate-700">Default facility for new records</label>
                <Select value={facilityPref} onChange={(e) => setFacilityPref(e.target.value)} className="mt-1 max-w-sm">
                  {data.facilities.filter((f) => f.status === 'Active').map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </Select>
              </div>
              <div className="text-xs text-slate-500 mt-2">Times shown in Asia/Kolkata (IST).</div>
            </div>

            <div className="glass-subtle rounded-xl p-4">
              <div className="text-sm font-semibold text-slate-900 mb-3">Data & privacy</div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleExportAll}>Export all data</Button>
                <Button variant="outline" onClick={() => exportToCsv(`patients-${new Date().toISOString().slice(0,10)}.csv`, ['Patient ID','Name','Phone','Status'], data.patients.map((p) => [p.patientNumber, p.name, p.phone ?? '', p.status]))}>Export patients</Button>
                {!usingSupabase && <Button variant="danger" onClick={() => setShowReset(true)}>Reset data</Button>}
              </div>
              <div className="text-xs text-slate-600 glass-subtle rounded-xl p-3 bg-slate-50 mt-3">
                <div className="font-semibold">Please note</div>
                <ul className="list-disc ml-4 mt-1 space-y-1">
                  <li>Stage, diagnosis and prognosis are clinician-entered only — never inferred.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal open={showAddFac} onClose={() => setShowAddFac(false)} title="Add facility">
        <div className="space-y-4">
          <Field label="Facility name" required><Input value={facForm.name ?? ''} onChange={(e) => setFacForm({ ...facForm, name: e.target.value })} /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Type"><Select value={facForm.facilityType ?? 'OPD Centre'} onChange={(e) => setFacForm({ ...facForm, facilityType: e.target.value as Facility['facilityType'] })}><option value="OPD Centre">OPD Centre</option><option value="Hospital">Hospital</option><option value="Clinic">Clinic</option></Select></Field>
            <Field label="Status"><Select value={facForm.status ?? 'Active'} onChange={(e) => setFacForm({ ...facForm, status: e.target.value as Facility['status'] })}><option value="Active">Active</option><option value="Inactive">Inactive</option></Select></Field>
          </div>
          <Field label="Address" required><Input value={facForm.address ?? ''} onChange={(e) => setFacForm({ ...facForm, address: e.target.value })} /></Field>
          <Field label="Contact"><Input value={facForm.contact ?? ''} onChange={(e) => setFacForm({ ...facForm, contact: e.target.value })} /></Field>
          <Field label="Notes"><Textarea value={facForm.notes ?? ''} onChange={(e) => setFacForm({ ...facForm, notes: e.target.value })} rows={2} /></Field>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowAddFac(false)}>Cancel</Button><Button onClick={handleSaveFac}>Save facility</Button></div>
        </div>
      </Modal>
      <Modal open={!!editingFac} onClose={() => setEditingFac(null)} title="Edit facility">
        <div className="space-y-4">
          <Field label="Facility name" required><Input value={facForm.name ?? ''} onChange={(e) => setFacForm({ ...facForm, name: e.target.value })} /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Type"><Select value={facForm.facilityType ?? 'OPD Centre'} onChange={(e) => setFacForm({ ...facForm, facilityType: e.target.value as Facility['facilityType'] })}><option value="OPD Centre">OPD Centre</option><option value="Hospital">Hospital</option><option value="Clinic">Clinic</option></Select></Field>
            <Field label="Status"><Select value={facForm.status ?? 'Active'} onChange={(e) => setFacForm({ ...facForm, status: e.target.value as Facility['status'] })}><option value="Active">Active</option><option value="Inactive">Inactive</option></Select></Field>
          </div>
          <Field label="Address" required><Input value={facForm.address ?? ''} onChange={(e) => setFacForm({ ...facForm, address: e.target.value })} /></Field>
          <Field label="Contact"><Input value={facForm.contact ?? ''} onChange={(e) => setFacForm({ ...facForm, contact: e.target.value })} /></Field>
          <Field label="Notes"><Textarea value={facForm.notes ?? ''} onChange={(e) => setFacForm({ ...facForm, notes: e.target.value })} rows={2} /></Field>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditingFac(null)}>Cancel</Button><Button onClick={handleSaveFac}>Save changes</Button></div>
        </div>
      </Modal>

      <Modal open={showReset} onClose={() => setShowReset(false)} title="Reset data?">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">This will delete all changes you made and restore the original data. This cannot be undone.</p>
          <p className="text-sm font-medium text-slate-900">Are you sure you want to reset?</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowReset(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleReset}>Reset data</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
