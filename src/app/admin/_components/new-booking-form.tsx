'use client'

import { useEffect, useState } from 'react'
import { DatePicker } from '@/components/date-picker'
import { addDays, diffDays, todayInChile } from '@/lib/dates'
import { formatCLP } from '@/lib/money'
import { createManualBookingAction, quoteAction, type QuoteResult } from '../actions'
import { useAdmin } from './admin-provider'
import { PAYMENT_METHODS } from './model'
import { cls } from './ui'

export type NewBookingPrefill = { cabinId?: string; checkIn?: string; checkOut?: string }

const toInt = (v: string) => Math.max(0, Math.round(Number(v.replace(/[^\d]/g, '')) || 0))

export function Segmented<T extends string>({ value, onChange, options, ariaLabel }: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[]; ariaLabel: string }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-1.5 rounded-xl bg-ink p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`min-h-10 flex-1 rounded-[9px] px-3 text-[13px] font-semibold transition-colors ${value === o.id ? 'bg-amber text-amber-ink' : 'text-sub hover:bg-surface-2 hover:text-cream'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Stepper({ value, onChange, min = 1, max = 20, label }: { value: number; onChange: (n: number) => void; min?: number; max?: number; label: string }) {
  return (
    <div className="flex h-11 items-center gap-1 rounded-[10px] border border-cream/15 bg-ink px-1" role="group" aria-label={label}>
      <button type="button" aria-label="Menos" disabled={value <= min} onClick={() => onChange(value - 1)} className="h-9 w-9 rounded-lg text-lg font-bold hover:bg-surface-2 disabled:opacity-30">−</button>
      <span className="flex-1 text-center text-[15px] font-semibold tabular-nums" aria-live="polite">{value}</span>
      <button type="button" aria-label="Más" disabled={value >= max} onClick={() => onChange(value + 1)} className="h-9 w-9 rounded-lg text-lg font-bold hover:bg-surface-2 disabled:opacity-30">+</button>
    </div>
  )
}

export function NewBookingForm({ prefill, onDone }: { prefill?: NewBookingPrefill; onDone: () => void }) {
  const { cabins, run } = useAdmin()
  const today = todayInChile()
  const [cabinId, setCabinId] = useState(prefill?.cabinId ?? cabins[0]?.id ?? '')
  const [checkIn, setCheckIn] = useState(prefill?.checkIn ?? '')
  const [checkOut, setCheckOut] = useState(prefill?.checkOut ?? '')
  const [guests, setGuests] = useState(2)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('+56 9 ')
  const [email, setEmail] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [total, setTotal] = useState('')
  const [totalTouched, setTotalTouched] = useState(false)
  const [paid, setPaid] = useState<'none' | 'partial' | 'full'>('none')
  const [partial, setPartial] = useState('')
  const [method, setMethod] = useState('transferencia')
  const [notes, setNotes] = useState('')
  const [qRaw, setQ] = useState<QuoteResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cabin = cabins.find((c) => c.id === cabinId)
  const nights = checkIn && checkOut && checkOut > checkIn ? diffDays(checkIn, checkOut) : 0

  useEffect(() => {
    let alive = true
    if (!cabinId || !nights) return
    quoteAction(cabinId, checkIn, checkOut).then((r) => {
      if (!alive) return
      setQ(r)
      if (r.ok && !totalTouched && !r.unpriced) setTotal(String(r.total))
    })
    return () => {
      alive = false
    }
  }, [cabinId, checkIn, checkOut, nights, totalTouched])

  const q = nights ? qRaw : null
  const totalN = toInt(total)
  const amountPaid = paid === 'full' ? totalN : paid === 'partial' ? Math.min(toInt(partial), totalN) : 0
  const conflicts = q && q.ok ? q.conflicts : []
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!nights) return setError('Elige la fecha de llegada y de salida.')
    if (!firstName.trim()) return setError('Escribe el nombre del huésped.')
    setSaving(true)
    const r = await run(() =>
      createManualBookingAction({
        cabinId,
        checkIn,
        checkOut,
        guests,
        firstName,
        lastName,
        phone: phone.trim() === '+56 9' ? '' : phone,
        email,
        sendEmail: sendEmail && emailOk,
        total: totalN,
        amountPaid,
        paymentMethod: amountPaid > 0 ? method : '',
        notes,
      }),
    )
    setSaving(false)
    if (r.ok) onDone()
    else setError(r.error ?? 'No se pudo crear')
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[1.5px] text-muted">Estadía</h3>
        <Segmented ariaLabel="Cabaña" value={cabinId} onChange={setCabinId} options={cabins.map((c) => ({ id: c.id, label: c.name }))} />
        <div className="grid grid-cols-2 gap-3">
          <div className={cls.label}>
            <span aria-hidden="true">Llegada</span>
            <DatePicker
              aria-label="Llegada"
              value={checkIn}
              onChange={(v) => {
                setCheckIn(v)
                if (!checkOut || checkOut <= v) setCheckOut(addDays(v, 2))
              }}
              className={`${cls.input} flex items-center`}
            />
          </div>
          <div className={cls.label}>
            <span aria-hidden="true">Salida</span>
            <DatePicker aria-label="Salida" value={checkOut} min={checkIn ? addDays(checkIn, 1) : undefined} openTo={checkIn || undefined} onChange={setCheckOut} className={`${cls.input} flex items-center`} />
          </div>
        </div>
        <div className="grid grid-cols-2 items-end gap-3">
          <div className={cls.label}>
            <span>Huéspedes</span>
            <Stepper label="Huéspedes" value={guests} onChange={setGuests} max={cabin?.capacity ?? 20} />
          </div>
          <p className="pb-3 text-sm text-sub">{nights ? `${nights} ${nights === 1 ? 'noche' : 'noches'}` : 'Elige las fechas'}</p>
        </div>
        {checkIn && checkIn < today && <p className="text-[13px] text-amber-light">Ojo: la llegada es una fecha pasada.</p>}
        {conflicts.length > 0 && (
          <p role="alert" className="rounded-xl border border-[#E6837A]/40 bg-[#3A1D1A] px-3.5 py-2.5 text-[13px] text-[#F9CFC9]">
            No disponible: se cruza con {conflicts.join(', ')}.
          </p>
        )}
        {q && q.ok && nights > 0 && nights < q.minNights && conflicts.length === 0 && (
          <p className="text-[13px] text-amber-light">La estadía mínima configurada para esas fechas es de {q.minNights} noches (como reserva manual igual puedes crearla).</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[1.5px] text-muted">Huésped</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className={cls.label}>Nombre<input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={cls.input} autoComplete="off" /></label>
          <label className={cls.label}>Apellido<input value={lastName} onChange={(e) => setLastName(e.target.value)} className={cls.input} autoComplete="off" /></label>
          <label className={cls.label}>Teléfono / WhatsApp<input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" className={cls.input} autoComplete="off" /></label>
          <label className={cls.label}>Correo (opcional)<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className={cls.input} autoComplete="off" /></label>
        </div>
        {emailOk && (
          <label className="flex items-center gap-3 text-sm text-sub">
            <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="h-5 w-5 accent-amber" />
            Enviarle la confirmación y el recordatorio por correo
          </label>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[1.5px] text-muted">Cobro</h3>
        <label className={cls.label}>
          Total de la estadía (CLP)
          <input
            value={total ? formatCLP(toInt(total)).replace('$', '').trim() : ''}
            onChange={(e) => {
              setTotalTouched(true)
              setTotal(String(toInt(e.target.value)))
            }}
            inputMode="numeric"
            placeholder="0"
            className={`${cls.input} text-lg font-semibold`}
          />
        </label>
        {q && q.ok && !q.unpriced && nights > 0 && (
          <p className="-mt-1 text-xs text-muted">
            Precio según tarifas: {formatCLP(q.subtotal)}{q.cleaningFee ? ` + limpieza ${formatCLP(q.cleaningFee)}` : ''} = <strong className="text-sub">{formatCLP(q.total)}</strong>
            {totalTouched && totalN !== q.total && (
              <button type="button" onClick={() => { setTotal(String(q.total)); setTotalTouched(false) }} className="ml-2 text-amber underline underline-offset-2">usar este</button>
            )}
          </p>
        )}
        <Segmented
          ariaLabel="Estado del pago"
          value={paid}
          onChange={setPaid}
          options={[
            { id: 'none', label: 'Sin pago aún' },
            { id: 'partial', label: 'Abono' },
            { id: 'full', label: 'Pagado completo' },
          ]}
        />
        {paid === 'partial' && (
          <label className={cls.label}>
            Monto abonado (CLP)
            <input value={partial ? formatCLP(toInt(partial)).replace('$', '').trim() : ''} onChange={(e) => setPartial(String(toInt(e.target.value)))} inputMode="numeric" className={cls.input} />
          </label>
        )}
        {paid !== 'none' && (
          <Segmented ariaLabel="Medio de pago" value={method} onChange={setMethod} options={PAYMENT_METHODS.map((m) => ({ id: m.id, label: m.label }))} />
        )}
      </section>

      <label className={cls.label}>
        Notas internas (solo las ven ustedes)
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Ej: llegan tarde, traen mascota, pidieron leña…" className={cls.textarea} />
      </label>

      {error && <p role="alert" className="rounded-xl border border-[#E6837A]/40 bg-[#3A1D1A] px-3.5 py-2.5 text-sm text-[#F9CFC9]">{error}</p>}

      <div className="sticky bottom-0 -mx-5 -mb-5 flex items-center justify-between gap-3 border-t border-cream/[0.07] bg-[#171411] px-5 py-4 md:-mx-6 md:px-6">
        <div className="text-sm">
          <p className="font-semibold">{totalN ? formatCLP(totalN) : '—'}</p>
          <p className="text-xs text-muted">{amountPaid ? `Pagado ${formatCLP(amountPaid)} · saldo ${formatCLP(totalN - amountPaid)}` : 'Sin pagos registrados'}</p>
        </div>
        <button type="submit" disabled={saving || conflicts.length > 0} className={cls.btn}>
          {saving ? 'Guardando…' : 'Crear reserva'}
        </button>
      </div>
    </form>
  )
}
