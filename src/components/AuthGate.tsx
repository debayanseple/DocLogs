import { useState } from 'react'
import { useAuth } from '../services/auth'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Input, Field } from './ui/Input'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, isConfigured, signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // If backend is not configured, fall back to local mode
  if (!isConfigured) return <>{children}</>
  if (loading)
    return (
      <>
        <div className="app-bg" aria-hidden="true" />
        <div className="relative min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
            <span className="sr-only">Loading…</span>
            <div className="w-10 h-10 rounded-full border-2 border-white/60 border-t-[#162a4d] animate-spin" />
            <span className="text-sm text-slate-500">Loading your workspace…</span>
          </div>
        </div>
      </>
    )
  if (user) {
    return <>{children}</>
  }

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'signup' && !fullName.trim()) {
      setMsg('Full name is required.')
      return
    }
    setBusy(true)
    setMsg(null)
    const { error } =
      mode === 'signin' ? await signIn(email, password) : await signUp(email, password, fullName)
    setMsg(error ?? (mode === 'signup' ? 'Account created. Check your email if confirmation is required, then sign in.' : 'Signed in.'))
    setBusy(false)
  }

  return (
    <>
      <div className="app-bg" aria-hidden="true" />
      <div className="relative min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md" strong>
        <h1 className="text-xl font-bold text-slate-900">ClinicaLog — {mode === 'signin' ? 'Sign in' : 'Create account'}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {mode === 'signin' ? 'Sign in to your private workspace.' : 'Create your workspace. Your name is stored in your profile.'}
        </p>
        <form onSubmit={handle} className="mt-6 space-y-4">
          {mode === 'signup' && (
            <Field label="Full name">
              <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dr. Arjun Sen" />
            </Field>
          )}
          <Field label="Email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></Field>
          <Field label="Password"><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></Field>
          {msg && <div className={`text-sm p-2 rounded-lg border ${msg.includes('Check') || msg.includes('Signed') ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>{msg}</div>}
          <Button type="submit" disabled={busy} className="w-full">{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}</Button>
          <div className="text-sm text-center">
            {mode === 'signin' ? (
              <button type="button" onClick={() => setMode('signup')} className="text-[#162a4d] hover:underline">Need an account? Sign up</button>
            ) : (
              <button type="button" onClick={() => setMode('signin')} className="text-[#162a4d] hover:underline">Have an account? Sign in</button>
            )}
          </div>
        </form>
      </Card>
      </div>
    </>
  )
}
