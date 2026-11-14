// Piezas visuales del panel. Server-safe (sin hooks).
import type { ReactNode } from 'react'

export const cls = {
  input:
    'fx-field h-11 w-full rounded-[10px] border border-cream/15 bg-ink px-3 text-[15px] text-cream placeholder:text-muted/60',
  textarea:
    'fx-field w-full rounded-[10px] border border-cream/15 bg-ink px-3 py-2.5 text-[15px] text-cream placeholder:text-muted/60',
  label: 'flex flex-col gap-1.5 text-[13px] font-medium text-sub',
  btn: 'fx-btn inline-flex h-11 items-center justify-center gap-2 rounded-full bg-amber px-5 text-sm font-bold text-amber-ink',
  btnSm: 'fx-btn inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-amber px-4 text-[13px] font-bold text-amber-ink',
  ghost:
    'fx-ghost inline-flex h-10 items-center justify-center gap-2 rounded-full border border-cream/20 px-4 text-[13px] font-semibold text-cream',
  ghostSm:
    'fx-ghost inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-cream/20 px-3 text-xs font-semibold text-cream',
  danger:
    'fx-ghost inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#E6837A]/40 px-4 text-[13px] font-semibold text-[#F4B4AC]',
  card: 'rounded-2xl border border-cream/[0.06] bg-surface',
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.01em] md:text-[30px]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ title, action, children, className = '', pad = true }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={`${cls.card} ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-cream/[0.06] px-5 py-3.5">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {action}
        </div>
      )}
      <div className={pad ? 'p-5' : ''}>{children}</div>
    </section>
  )
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'amber' | 'green' | 'red' }) {
  const c = tone === 'amber' ? 'text-amber' : tone === 'green' ? 'text-[#8FE0AE]' : tone === 'red' ? 'text-[#F4B4AC]' : 'text-cream'
  return (
    <div className={`fx-tile ${cls.card} p-4 md:p-5`}>
      <p className="text-[12px] font-medium uppercase tracking-[1.2px] text-muted">{label}</p>
      <p className={`mt-2 text-[26px] font-bold leading-none tabular-nums md:text-[30px] ${c}`}>{value}</p>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </div>
  )
}

const BADGE: Record<string, string> = {
  green: 'bg-[#1F3A2A] text-[#A7E3BC]',
  amber: 'bg-amber/15 text-amber-light',
  red: 'bg-[#4A221E] text-[#F4B4AC]',
  blue: 'bg-[#1D2B4D] text-[#AFC6FF]',
  gray: 'bg-surface-2 text-sub',
}

export function Badge({ tone = 'gray', children }: { tone?: keyof typeof BADGE; children: ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${BADGE[tone]}`}>{children}</span>
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted">{children}</p>
}
