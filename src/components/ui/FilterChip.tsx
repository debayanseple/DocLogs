import type { ReactNode, SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * Dense filter dropdown — sizes to its label rather than a fixed width.
 */
export function FilterChip({
  value,
  onChange,
  children,
  className = '',
  ...rest
}: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  children: ReactNode
  className?: string
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange' | 'children'>) {
  return (
    <div className={`relative shrink-0 ${className}`}>
      <select
        {...rest}
        value={value}
        onChange={onChange}
        className="appearance-none h-8 w-full pl-2.5 pr-6 rounded-xl text-xs font-medium text-slate-700 cursor-pointer bg-white/55 backdrop-blur-md border border-white/70 hover:bg-white/75 focus:outline-none focus:ring-2 focus:ring-[#162a4d]/20 focus:bg-white/80"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
    </div>
  )
}
