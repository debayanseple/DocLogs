import type { CSSProperties, ReactNode } from 'react'

/**
 * Base shimmer block. Renders as a rounded placeholder with a
 * travelling highlight; `className` should carry size/shape.
 */
export function Skeleton({
  className = '',
  style,
}: {
  className?: string
  style?: CSSProperties
}) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />
}

export function SkeletonText({
  lines = 3,
  className = '',
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`glass rounded-2xl p-5 ${className}`} aria-hidden="true">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonText lines={3} className="mt-4" />
    </div>
  )
}

/** Dashboard-style metric tile. */
export function SkeletonStat() {
  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-3" aria-hidden="true">
      <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-10" />
        <Skeleton className="h-2.5 w-16" />
      </div>
    </div>
  )
}

/** Generic table placeholder: header row + body rows. */
export function SkeletonTable({
  rows = 6,
  cols = 6,
}: {
  rows?: number
  cols?: number
}) {
  return (
    <div className="glass rounded-2xl overflow-hidden" aria-hidden="true">
      <div className="bg-white/50 backdrop-blur-sm border-b border-white/70 px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-white/50">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-4 py-3.5 flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                className={`h-3 flex-1 ${c === 0 ? 'max-w-[80px]' : ''}`}
                style={{ animationDelay: `${(r * cols + c) * 40}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Mobile-style list rows (avatar + stacked lines). */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="glass rounded-2xl overflow-hidden divide-y divide-white/50" aria-hidden="true">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="p-4 flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-4 w-12 rounded-full" />
            </div>
            <Skeleton className="h-2.5 w-1/4" />
            <Skeleton className="h-2.5 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Toolbar: search + a couple of chips + action button. */
export function SkeletonToolbar({ chips = 1 }: { chips?: number }) {
  return (
    <div className="glass rounded-2xl p-3 space-y-2.5" aria-hidden="true">
      <Skeleton className="h-8 w-full rounded-xl" />
      <div className="flex items-center gap-2">
        {Array.from({ length: chips }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-28 rounded-xl" />
        ))}
        <Skeleton className="h-8 w-8 rounded-xl ml-auto" />
      </div>
    </div>
  )
}

/** Wraps a page while data is loading, keeping layout stable. */
export function SkeletonPage({ children }: { children: ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading…</span>
      {children}
    </div>
  )
}