import type { ReactNode } from 'react'

type Tone =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'

const map: Record<Tone, string> = {
  default: 'bg-slate-100/70 text-slate-700 border-white/70',
  success: 'bg-emerald-100/60 text-emerald-700 border-emerald-200/70',
  warning: 'bg-amber-100/60 text-amber-700 border-amber-200/70',
  danger: 'bg-red-100/60 text-red-700 border-red-200/70',
  info: 'bg-blue-100/60 text-blue-700 border-blue-200/70',
  neutral: 'bg-white/60 text-slate-600 border-white/70',
}

export function Badge({
  children,
  variant = 'default',
}: {
  children: ReactNode
  variant?: Tone
}) {
  return (
    <span
      className={`inline-flex shrink-0 whitespace-nowrap items-center px-2 py-0.5 rounded-full text-xs font-medium border backdrop-blur-sm ${map[variant]}`}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const v = (() => {
    if (status === 'Finalised') return 'success'
    if (status === 'Pending Review') return 'warning'
    if (status === 'Draft') return 'neutral'
    if (status === 'Amended') return 'info'
    if (status === 'Overdue') return 'danger'
    if (status === 'Due') return 'warning'
    if (status === 'Completed') return 'success'
    if (status === 'Upcoming') return 'info'
    if (status === 'Cancelled') return 'neutral'
    if (status === 'Active') return 'success'
    if (status === 'Inactive') return 'neutral'
    return 'default'
  })() as Tone
  return <Badge variant={v}>{status}</Badge>
}