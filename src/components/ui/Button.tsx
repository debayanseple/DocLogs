import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg'

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  children: ReactNode
}) {
  const base =
    'inline-flex items-center justify-center font-medium rounded-lg sm:rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed gap-1 sm:gap-1.5 active:scale-[0.97] shrink-0'

  const variants: Record<Variant, string> = {
    primary:
      'bg-[#162a4d]/90 text-white hover:bg-[#1e3a5f] focus:ring-slate-400/50 backdrop-blur-md shadow-[0_4px_12px_-6px_rgba(22,42,77,0.5)]',
    secondary:
      'bg-teal-600/85 text-white hover:bg-teal-700 focus:ring-teal-400/50 backdrop-blur-md shadow-[0_4px_12px_-6px_rgba(13,148,136,0.45)]',
    ghost:
      'bg-white/50 text-slate-600 hover:bg-white/80 active:bg-white focus:ring-slate-300/60 backdrop-blur-md',
    danger:
      'bg-red-600/85 text-white hover:bg-red-700 focus:ring-red-400/50 backdrop-blur-md shadow-[0_4px_12px_-6px_rgba(220,38,38,0.45)]',
    outline:
      'border border-white/70 bg-white/45 text-slate-700 hover:bg-white/70 active:bg-white/80 focus:ring-slate-300/60 backdrop-blur-md shadow-[0_3px_10px_-6px_rgba(15,30,58,0.16)]',
  }

  // Mobile first: compact. sm+ stays roomy but no longer bulky.
  const sizes: Record<Size, string> = {
    sm: 'h-8 px-2.5 text-xs sm:h-auto sm:px-2.5 sm:py-1.5 sm:text-xs',
    md: 'h-9 px-3 text-[13px] sm:h-auto sm:px-3 sm:py-1.5 sm:text-[13px]',
    lg: 'h-10 px-3.5 text-[13px] sm:h-auto sm:px-3.5 sm:py-2 sm:text-[13px]',
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}