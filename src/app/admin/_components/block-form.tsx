'use client'

import { useState } from 'react'
import { DatePicker } from '@/components/date-picker'
import { addDays, diffDays } from '@/lib/dates'
import { createBlockAction } from '../actions'
import { useAdmin } from './admin-provider'
import { cls } from './ui'

/** firstNight y lastNight son noches incluidas. */
export type BlockPrefill = { cabinId?: string; firstNight?: string; lastNight?: string }

const REASONS = ['Mantención', 'Uso propio', 'Limpieza profunda', 'Reserva por fuera']

export function BlockForm({ prefill, onDone }: { prefill?: BlockPrefill; onDone: () => void }) {
  const { cabins, run } = useAdmin()
  const [ids, setIds] = useState<string[]>(prefill?.cabinId ? [prefill.cabinId] : cabins.map((c) => c.id))
  const [first, setFirst] = useState(prefill?.firstNight ?? '')
  const [last, setLast] = useState(prefill?.lastNight ?? '')
  const [reason, setReason] = useState('Mantención')
  const [saving, setSaving] = useState(false)
  const nights = first && last && last >= first ? diffDays(first, last) + 1 : 0

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!nights) return
    setSaving(true)
    const r = await run(() => createBlockAction(ids, first, addDays(last, 1), reason))
    setSaving(false)
    if (r.ok) onDone()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-[1.5px] text-muted">Cabañas</legend>
        {cabins.map((c) => (
          <label key={c.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl bg-ink px-3.5 text-[15px]">
            <input
              type="checkbox"
              checked={ids.includes(c.id)}
              onChange={(e) => setIds((v) => (e.target.checked ? [...v, c.id] : v.filter((x) => x !== c.id)))}
              className="h-5 w-5 accent-amber"
            />
            {c.name}
          </label>
        ))}
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <div className={cls.label}>
          <span aria-hidden="true">Primera noche</span>
          <DatePicker aria-label="Primera noche" value={first} onChange={(v) => { setFirst(v); if (!last || last < v) setLast(v) }} className={`${cls.input} flex items-center`} />
        </div>
        <div className={cls.label}>
          <span aria-hidden="true">Última noche</span>
          <DatePicker aria-label="Última noche" value={last} min={first || undefined} openTo={first || undefined} onChange={setLast} className={`${cls.input} flex items-center`} />
        </div>
      </div>
      <p className="-mt-3 text-[13px] text-muted">{nights ? `${nights} ${nights === 1 ? 'noche bloqueada' : 'noches bloqueadas'}` : 'Ambas fechas incluidas'}</p>
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-sub">Motivo</span>
        <div className="flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <button key={r} type="button" onClick={() => setReason(r)} className={`min-h-9 rounded-full border px-3.5 text-[13px] font-semibold ${reason === r ? 'border-amber bg-amber/15 text-amber-light' : 'border-cream/15 text-sub hover:text-cream'}`}>
              {r}
            </button>
          ))}
        </div>
        <input value={reason} onChange={(e) => setReason(e.target.value)} className={cls.input} aria-label="Motivo" />
      </div>
      <button type="submit" disabled={saving || !nights || !ids.length} className={cls.btn}>
        {saving ? 'Guardando…' : 'Bloquear fechas'}
      </button>
    </form>
  )
}
