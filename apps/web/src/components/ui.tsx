/**
 * The shared primitives, ported from the prototype's `@layer components` block in
 * index.css — `dash-card`, `pill-*`, `btn-primary`, `hr-input`.
 *
 * The prototype had 19 shared components and imported them into zero of 545 pages,
 * writing 23,567 inline styles instead. These are deliberately few and deliberately
 * boring so that using them is easier than not.
 */
import type { ReactNode } from 'react'

export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-xl border border-gray-100 bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

const PILL: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-600 border-red-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  violet: 'bg-violet-50 text-violet-700 border-violet-200',
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
}

export type PillTone = keyof typeof PILL

export function Pill({ tone = 'slate', children }: { tone?: PillTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${PILL[tone] ?? PILL.slate}`}
    >
      {children}
    </span>
  )
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }) {
  const base =
    'rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50'
  const tone =
    variant === 'primary'
      ? 'bg-blue-600 text-white hover:bg-blue-700'
      : 'border border-gray-200 bg-white font-medium text-gray-700 hover:bg-gray-50'
  return <button className={`${base} ${tone} ${className}`} {...props} />
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-400"
      {...props}
    />
  )
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-blue-400"
      {...props}
    />
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  )
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: ReactNode
  hint?: string
}) {
  // The prototype's stat card: a small grey caption above a large near-black number,
  // with an optional grey line beneath. Not a coloured number — colour there competes
  // with the status pills, which are the thing that should actually catch the eye.
  return (
    <Card className="p-4">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-slate-900">
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-slate-400">{hint}</div>}
    </Card>
  )
}

/** The prototype's section divider: uppercase, letter-spaced, quiet. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-2 mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
      {children}
    </h2>
  )
}

/** The prototype leans on tinted full-width banners for setup state and warnings. */
export function Banner({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warning'
  title: string
  children?: ReactNode
}) {
  const style =
    tone === 'warning'
      ? 'border-amber-300 bg-amber-50 text-amber-900'
      : 'border-blue-200 bg-blue-50 text-blue-900'
  return (
    <div className={`mb-4 rounded-xl border px-4 py-3 ${style}`}>
      <div className="text-sm font-bold">{title}</div>
      {children && <div className="mt-0.5 text-xs opacity-90">{children}</div>}
    </div>
  )
}

/** A dense table with the prototype's hairline rules and uppercase micro-headers. */
export function Table({
  columns,
  children,
  empty,
}: {
  columns: string[]
  children: ReactNode
  empty?: boolean
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left">
            {columns.map((c) => (
              <th
                key={c}
                className="whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {empty ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-400">
                Nothing here yet.
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  )
}

export function Row({ children }: { children: ReactNode }) {
  return <tr className="border-b border-slate-100 last:border-none hover:bg-slate-50/60">{children}</tr>
}

export function Cell({
  children,
  mono = false,
  className = '',
}: {
  children: ReactNode
  mono?: boolean
  className?: string
}) {
  return (
    <td className={`px-4 py-2.5 ${mono ? 'font-mono text-xs text-slate-600' : ''} ${className}`}>
      {children}
    </td>
  )
}
