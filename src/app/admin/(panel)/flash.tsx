export function Flash({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const ok = typeof sp.ok === 'string' ? sp.ok : null
  const error = typeof sp.error === 'string' ? sp.error : null
  if (!ok && !error) return null
  return (
    <p
      role={error ? 'alert' : 'status'}
      className={`fx-up mb-6 rounded-xl border px-4 py-3 text-sm ${error ? 'border-amber/40 bg-amber/10 text-amber-light' : 'border-[#4ADE80]/30 bg-[#1F3A2A] text-[#A7E3BC]'}`}
    >
      {error ?? ok}
    </p>
  )
}

export const card = 'rounded-[14px] bg-surface'
export const inputCls = 'fx-field min-h-[46px] rounded-[10px] border border-cream/20 bg-ink px-3 text-[15px] text-cream'
export const labelCls = 'flex flex-col gap-1.5 text-[13px] font-semibold text-sub'
export const btn = 'fx-btn min-h-[44px] rounded-full bg-amber px-5 text-sm font-bold text-amber-ink'
export const ghost = 'fx-ghost min-h-[40px] rounded-full border border-cream/25 px-4 text-[13px] font-semibold text-cream'
