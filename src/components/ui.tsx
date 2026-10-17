import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import {
  fromFaDigits,
  isoToJalali,
  jalaliMonthLength,
  jalaliToIso,
  JALALI_MONTHS,
  toFaDigits,
  todayIso,
} from '../lib/dates'
import { fmt, shortToman } from '../lib/format'
import { Icon } from './Icon'

/* ----------------------------- Card ----------------------------- */

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[var(--radius-card)] border border-line bg-surface shadow-card ${className}`}>
      {children}
    </div>
  )
}

/* ---------------------------- Button ---------------------------- */

type Variant = 'primary' | 'soft' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-primary shadow-sm hover:brightness-95',
  soft: 'bg-brand-soft text-brand hover:brightness-95',
  ghost: 'text-muted hover:bg-surface-2 hover:text-text',
  danger: 'bg-bad-soft text-bad hover:brightness-95',
}

export function Button({
  variant = 'primary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...rest}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    />
  )
}

export function IconButton({
  label,
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      className={`inline-flex size-10 items-center justify-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-text ${className}`}
    >
      {children}
    </button>
  )
}

/* ----------------------------- Badge ---------------------------- */

const TONES = {
  neutral: 'bg-surface-2 text-muted',
  brand: 'bg-brand-soft text-brand',
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-bad-soft text-bad',
} as const

export function Badge({ tone = 'neutral', children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ${TONES[tone]}`}
    >
      {children}
    </span>
  )
}

/* ----------------------------- Field ---------------------------- */

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: ReactNode
  error?: string | null
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-muted">{label}</span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs text-bad">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  )
}

export const inputCls =
  'h-12 w-full rounded-[var(--radius-control)] border border-line bg-surface px-4 text-[15px] text-text outline-none transition placeholder:text-muted/70 focus:border-brand focus:ring-4 focus:ring-brand/15'

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ''}`} />
}

/* ------------------------- Amount input ------------------------- */

export function AmountInput({
  value,
  onChange,
  placeholder,
}: {
  value: number
  onChange: (n: number) => void
  placeholder?: string
}) {
  const [text, setText] = useState(value > 0 ? fmt(value) : '')
  return (
    <div>
      <div className="relative">
        <input
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder ?? '۰'}
          value={text}
          onChange={(e) => {
            const digits = fromFaDigits(e.target.value).replace(/\D/g, '').slice(0, 13)
            const n = digits ? Number(digits) : 0
            setText(n > 0 ? fmt(n) : '')
            onChange(n)
          }}
          className={`${inputCls} tnum pe-20 text-lg font-semibold`}
        />
        <span className="pointer-events-none absolute inset-y-0 end-4 flex items-center text-sm text-muted">
          تومان
        </span>
      </div>
      {value >= 1000 && <div className="mt-1.5 text-xs text-muted">{shortToman(value)}</div>}
    </div>
  )
}

/* ------------------------- Jalali date input -------------------- */

export function JalaliDateInput({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const { jy, jm, jd } = isoToJalali(value)
  const days = jalaliMonthLength(jy, jm)
  const first = Math.min(jy, isoToJalali(todayIso()).jy) - 1
  const years = Array.from({ length: 14 }, (_, i) => first + i)
  if (!years.includes(jy)) years.push(jy)
  years.sort((a, b) => a - b)

  const sel = `${inputCls} appearance-none px-3 text-center`
  return (
    <div className="grid grid-cols-[1fr_1.7fr_1.2fr] gap-2" dir="rtl">
      <select
        aria-label="روز"
        className={sel}
        value={jd}
        onChange={(e) => onChange(jalaliToIso(jy, jm, Number(e.target.value)))}
      >
        {Array.from({ length: days }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            {toFaDigits(d)}
          </option>
        ))}
      </select>
      <select
        aria-label="ماه"
        className={sel}
        value={jm}
        onChange={(e) => onChange(jalaliToIso(jy, Number(e.target.value), jd))}
      >
        {JALALI_MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </select>
      <select
        aria-label="سال"
        className={sel}
        value={jy}
        onChange={(e) => onChange(jalaliToIso(Number(e.target.value), jm, jd))}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {toFaDigits(y)}
          </option>
        ))}
      </select>
    </div>
  )
}

/* ----------------------------- Segmented ------------------------ */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="grid auto-cols-fr grid-flow-col rounded-2xl bg-surface-2 p-1" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-10 rounded-xl text-sm font-semibold transition ${
            value === o.value ? 'bg-surface text-brand shadow-sm' : 'text-muted hover:text-text'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl bg-surface-2 px-4 py-3 text-start"
    >
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      </span>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-brand' : 'bg-line'}`}
      >
        <span
          className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${
            checked ? 'start-1' : 'start-6'
          }`}
        />
      </span>
    </button>
  )
}

/* ------------------------------ Modal --------------------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-primary/55 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="anim-sheet relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-line bg-surface shadow-2xl sm:max-w-md sm:rounded-2xl"
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <h2 className="text-lg font-bold">{title}</h2>
          <IconButton label="بستن" onClick={onClose}>
            <Icon name="close" />
          </IconButton>
        </div>
        <div className="space-y-4 overflow-y-auto px-5 py-3">{children}</div>
        {footer && (
          <div className="flex gap-3 border-t border-line px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

/* --------------------------- Empty state ------------------------ */

export function EmptyState({
  title,
  text,
  children,
}: {
  title: string
  text: string
  children?: ReactNode
}) {
  return (
    <Card className="px-6 py-12 text-center">
      <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand">
        <Icon name="spark" size={26} />
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-muted">{text}</p>
      {children && <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>}
    </Card>
  )
}

export function ProgressBar({ value, tone = 'brand' }: { value: number; tone?: 'brand' | 'ok' | 'bad' }) {
  const color = tone === 'ok' ? 'bg-ok-fill' : tone === 'bad' ? 'bg-bad' : 'bg-accent'
  return (
    <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="presentation">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
      />
    </div>
  )
}

export function Select({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (v: string) => void
  children: ReactNode
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} appearance-none`}>
      {children}
    </select>
  )
}
