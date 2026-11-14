'use client'

import Link from 'next/link'
import { useState } from 'react'
import { IconCard } from '@/components/icons'
import { formatCLP } from '@/lib/money'

type Props = { cabinSlug: string; checkIn: string; checkOut: string; guests: number; total: number }

const input =
  'fx-field min-h-[50px] rounded-[10px] border border-cream/20 bg-surface px-3.5 text-base text-cream placeholder:text-muted/70'
const label = 'flex flex-col gap-2 text-sm font-semibold'
const legend = 'mb-5 p-0 text-[13px] font-bold uppercase tracking-[3px] text-amber'

export function CheckoutForm({ cabinSlug, checkIn, checkOut, guests, total }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    if (!fd.get('accept')) {
      setError('Debes aceptar las condiciones de reserva.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cabin: cabinSlug,
          checkIn,
          checkOut,
          guests,
          firstName: fd.get('firstName'),
          lastName: fd.get('lastName'),
          email: fd.get('email'),
          phone: fd.get('phone'),
          document: fd.get('document'),
          arrivalWindow: fd.get('arrivalWindow'),
          notes: fd.get('notes'),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No pudimos crear la reserva.')
      window.location.href = data.checkoutUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error. Inténtalo de nuevo.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} aria-label="Datos del huésped y pago" className="flex flex-col gap-10">
      <fieldset className="flex flex-col gap-4 border-0 p-0">
        <legend className={legend}>Datos del huésped principal</legend>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-4">
          <label className={label}>Nombre<input name="firstName" required autoComplete="given-name" className={input} /></label>
          <label className={label}>Apellido<input name="lastName" required autoComplete="family-name" className={input} /></label>
          <label className={label}>Correo electrónico<input name="email" type="email" required autoComplete="email" className={input} /></label>
          <label className={label}>Teléfono / WhatsApp<input name="phone" type="tel" required autoComplete="tel" defaultValue="+56 9 " className={input} /></label>
          <label className={label}>RUT o pasaporte<input name="document" autoComplete="off" className={input} /></label>
          <label className={label}>
            Hora estimada de llegada
            <select name="arrivalWindow" className={input} defaultValue="Entre 15:00 y 18:00">
              <option>Antes de las 15:00</option>
              <option>Entre 15:00 y 18:00</option>
              <option>Entre 18:00 y 21:00</option>
              <option>Después de las 21:00</option>
            </select>
          </label>
        </div>
        <label className={label}>
          Comentarios (opcional)
          <textarea name="notes" rows={3} maxLength={1000} placeholder="Celebración, viajan con niños, necesitas leña…" className={`${input} resize-y py-3.5`} />
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-4 border-0 p-0">
        <legend className={legend}>Pago</legend>
        <div className="flex items-start gap-4 rounded-[14px] border border-amber bg-surface p-5">
          <IconCard size={28} className="shrink-0 text-amber" />
          <div>
            <p className="text-[17px] font-bold">Mercado Pago</p>
            <p className="mt-1.5 text-[15px] leading-relaxed text-sub">
              Paga con tarjeta de crédito, débito o saldo en Mercado Pago. Al pagar, tu reserva queda confirmada al instante.
            </p>
          </div>
        </div>
        <label className="flex items-start gap-3 text-sm leading-normal text-sub">
          <input type="checkbox" name="accept" className="mt-0.5 h-5 w-5 shrink-0 accent-amber" />
          <span>
            Acepto las{' '}
            <Link href="/condiciones" target="_blank" className="text-amber underline underline-offset-4">
              condiciones de reserva y la política de cancelación
            </Link>
            .
          </span>
        </label>

        {error && (
          <p role="alert" className="fx-up rounded-xl border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber-light">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="fx-btn flex min-h-[60px] items-center justify-center gap-3 rounded-xl bg-amber text-[17px] font-bold text-amber-ink"
        >
          {loading && <span aria-hidden="true" className="fx-spin h-5 w-5 rounded-full border-2 border-amber-ink/30 border-t-amber-ink" />}
          {loading ? 'Conectando con Mercado Pago…' : `Pagar ${formatCLP(total)} con Mercado Pago`}
        </button>
        <p className="text-center text-[13px] text-muted">Serás redirigido a Mercado Pago para completar el pago de forma segura.</p>
      </fieldset>
    </form>
  )
}
