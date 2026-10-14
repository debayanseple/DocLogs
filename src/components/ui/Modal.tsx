import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

function useScrollLock(open: boolean) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])
}

/**
 * Responsive dialog: centered glass card on desktop, bottom sheet on mobile.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  widthClass = 'max-w-2xl',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  widthClass?: string
}) {
  useScrollLock(open)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`glass-strong relative w-full ${widthClass} rounded-t-2xl sm:rounded-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col border-white/80`}
      >
        {/* grab handle (mobile sheet) */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>
        <div className="flex items-center justify-between px-5 sm:px-6 py-3 sm:py-4 border-b border-white/60 shrink-0">
          <h2 className="font-semibold text-slate-900 text-[15px] sm:text-base">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 -mr-1 rounded-lg hover:bg-white/60 active:bg-white/80 min-w-[34px] min-h-[34px] flex items-center justify-center text-slate-500"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 sm:p-6 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * Slide-in drawer from the right.
 */
export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  useScrollLock(open)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-slate-900/25 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="glass-strong relative w-full max-w-lg h-full rounded-l-2xl lg:rounded-none flex flex-col overflow-hidden border-l-0 border-white/80">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/60 shrink-0">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 -mr-1 rounded-lg hover:bg-white/60 active:bg-white/80 min-w-[34px] min-h-[34px] flex items-center justify-center text-slate-500"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
          {children}
        </div>
      </div>
    </div>
  )
}