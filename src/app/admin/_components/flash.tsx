export function Flash({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const ok = typeof sp.ok === 'string' ? sp.ok : null
  const error = typeof sp.error === 'string' ? sp.error : null
  if (!ok && !error) return null
  return (
    <p
      role={error ? 'alert' : 'status'}
      className={`fx-up mb-5 rounded-xl border px-4 py-3 text-sm ${error ? 'border-[#E6837A]/40 bg-[#3A1D1A] text-[#F9CFC9]' : 'border-[#4ADE80]/25 bg-[#17301F] text-[#C4F0D2]'}`}
    >
      {error ?? ok}
    </p>
  )
}
