import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../services/auth'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Input, Field } from './ui/Input'

type AuthMode = 'signin' | 'signup' | 'forgot'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, isConfigured, isPasswordRecovery, signIn, signUp, sendPasswordReset, updatePassword } = useAuth()
  const [mode, setMode] = useState<AuthMode>('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [msg, setMsg] = useState<{ text: string; kind: 'success' | 'error' } | null>(null)
  const [busy, setBusy] = useState(false)

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

  const recovery = isPasswordRecovery
  if (user && !recovery) return <>{children}</>

  const clearMessage = () => setMsg(null)
  const toggleMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    setMsg(null)
    setPassword('')
    setConfirmPassword('')
  }

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      if (recovery) {
        if (password.length < 6) {
          setMsg({ text: 'Password must be at least 6 characters.', kind: 'error' })
        } else if (password !== confirmPassword) {
          setMsg({ text: 'Passwords do not match.', kind: 'error' })
        } else {
          const { error } = await updatePassword(password)
          if (error) setMsg({ text: error, kind: 'error' })
        }
      } else if (mode === 'forgot') {
        const { error } = await sendPasswordReset(email)
        setMsg(error
          ? { text: error, kind: 'error' }
          : { text: 'If an account exists for this email, you’ll receive a password reset link shortly.', kind: 'success' })
      } else if (mode === 'signup' && !fullName.trim()) {
        setMsg({ text: 'Please enter your full name.', kind: 'error' })
      } else {
        const { error } = mode === 'signin'
          ? await signIn(email, password)
          : await signUp(email, password, fullName)
        if (error) {
          setMsg({ text: error, kind: 'error' })
        } else {
          setMsg({
            text: mode === 'signup'
              ? 'Account created. Please check your email to verify, then sign in.'
              : 'Signed in. Welcome back.',
            kind: 'success',
          })
        }
      }
    } catch {
      setMsg({ text: 'Something went wrong. Please try again.', kind: 'error' })
    }
    setBusy(false)
  }

  const title = recovery
    ? 'Reset your password'
    : mode === 'forgot'
      ? 'Forgot password'
      : mode === 'signin'
        ? 'Sign in'
        : 'Create account'

  const passwordField = (label: string, value: string, onChange: (value: string) => void, visible: boolean, onToggle: () => void) => (
    <Field label={label}>
      <div className="relative">
        <Input
          type={visible ? 'text' : 'password'}
          required
          minLength={6}
          autoComplete={recovery ? 'new-password' : mode === 'signup' ? 'new-password' : 'current-password'}
          value={value}
          onChange={(e) => { onChange(e.target.value); clearMessage() }}
          placeholder="••••••••"
          className="pr-11"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#162a4d]/40 rounded-r-xl"
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
    </Field>
  )

  return (
    <>
      <div className="app-bg" aria-hidden="true" />
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md" strong>
          <h1 className="text-xl font-bold text-slate-900">ClinicaLog — {title}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {recovery
              ? 'Choose a new password for your account.'
              : mode === 'forgot'
                ? 'Enter your account email and we’ll send you a reset link.'
                : mode === 'signin'
                  ? 'Sign in to your private workspace.'
                  : 'Create your workspace. Your name is stored in your profile.'}
          </p>
          <form onSubmit={handle} className="mt-6 space-y-4">
            {!recovery && mode === 'signup' && (
              <Field label="Full name">
                <Input required value={fullName} onChange={(e) => { setFullName(e.target.value); clearMessage() }} placeholder="Dr. Arjun Sen" autoComplete="name" />
              </Field>
            )}
            {(!recovery) && (
              <Field label="Email">
                <Input type="email" required value={email} onChange={(e) => { setEmail(e.target.value); clearMessage() }} placeholder="you@example.com" autoComplete="email" />
              </Field>
            )}
            {recovery
              ? <>
                  {passwordField('New password', password, setPassword, showPassword, () => setShowPassword((show) => !show))}
                  {passwordField('Confirm new password', confirmPassword, setConfirmPassword, showConfirmPassword, () => setShowConfirmPassword((show) => !show))}
                </>
              : mode !== 'forgot' && passwordField('Password', password, setPassword, showPassword, () => setShowPassword((show) => !show))}
            {mode === 'signin' && !recovery && (
              <div className="-mt-2 text-right">
                <button type="button" onClick={() => toggleMode('forgot')} className="text-sm text-[#162a4d] hover:underline">Forgot password?</button>
              </div>
            )}
            {msg && (
              <div
                role="alert"
                className={`text-sm p-2 rounded-lg border ${msg.kind === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}
              >
                {msg.text}
              </div>
            )}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'Please wait…' : recovery ? 'Save new password' : mode === 'forgot' ? 'Send reset link' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
            {!recovery && (
              <div className="text-sm text-center">
                {mode === 'signin' ? (
                  <button type="button" onClick={() => toggleMode('signup')} className="text-[#162a4d] hover:underline">Need an account? Sign up</button>
                ) : mode === 'signup' ? (
                  <button type="button" onClick={() => toggleMode('signin')} className="text-[#162a4d] hover:underline">Have an account? Sign in</button>
                ) : (
                  <button type="button" onClick={() => toggleMode('signin')} className="text-[#162a4d] hover:underline">Back to sign in</button>
                )}
              </div>
            )}
          </form>
        </Card>
      </div>
    </>
  )
}
