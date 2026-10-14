import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

type ControlSize = 'sm' | 'md'

const fieldBase =
  'w-full rounded-xl text-slate-900 placeholder:text-slate-400 ' +
  'bg-white/55 backdrop-blur-md border border-white/70 ' +
  'shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset] ' +
  'focus:outline-none focus:ring-2 focus:ring-[#162a4d]/25 focus:bg-white/75 focus:border-white'

const sizeClass: Record<ControlSize, string> = {
  sm: 'px-2.5 py-1 text-xs min-h-[34px]',
  md: 'px-3 py-2 text-sm min-h-[44px] sm:min-h-0',
}

function cls(props: { size?: ControlSize; className?: string }) {
  const { size = 'md', className } = props
  return `${fieldBase} ${sizeClass[size]} ${className ?? ''}`
}

export function Input({
  size,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & { size?: ControlSize }) {
  return <input {...props} className={cls({ size, className: props.className })} />
}

export function Textarea({
  size,
  ...props
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> & { size?: ControlSize }) {
  return (
    <textarea
      {...props}
      className={`${cls({ size, className: props.className })} min-h-[80px] resize-y`}
    />
  )
}

export function Select({
  size,
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & { size?: ControlSize }) {
  return (
    <select
      {...props}
      style={{ backgroundImage: 'none', ...props.style }}
      className={`${cls({ size, className: props.className })} appearance-none pr-7`}
    />
  )
}

export function Label({
  children,
  required,
}: {
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <label className="text-sm font-medium text-slate-700 flex gap-1">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  )
}

export function Field({
  label,
  required,
  children,
  hint,
  error,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
  hint?: string
  error?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label required={required}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}