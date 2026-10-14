import type { ReactNode } from 'react'

export function Card({
  children,
  className = '',
  padding = true,
  strong = false,
}: {
  children: ReactNode
  className?: string
  padding?: boolean
  strong?: boolean
}) {
  return (
    <div
      className={`${strong ? 'glass-strong' : 'glass'} rounded-2xl ${
        padding ? 'p-5' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h3 className="font-semibold text-slate-900 text-[15px]">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}