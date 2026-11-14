'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { IconChevronLeft, IconChevronRight, IconLock } from '@/components/icons'
import {
  addDays,
  addMonths,
  daysInMonth,
  diffDays,
  formatDate,
  formatMonth,
  nightIsBusy,
  startOfMonth,
  weekdayMondayFirst,
  type Range,
} from '@/lib/dates'
import { formatCLP } from '@/lib/money'
import { nightPrice, quote, type Rate } from '@/lib/pricing'

type CabinInfo = {
  id: string
  slug: string
  name: string
  price_per_night: number
  cleaning_fee: number
  min_nights: number
  capacity: number
}

type Props = {
  cabin: CabinInfo
  today: string
  busy: Range[]
  rates?: Rate[]
  initialCheckIn?: string
  initialCheckOut?: string
  initialGuests?: number
  before?: React.ReactNode
  after?: React.ReactNode
}

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']
const MAX_MONTHS_AHEAD = 12

function rangeFree(from: string, to: string, busy: Range[]) {
  for (let d = from; d < to; d = addDays(d, 1)) if (nightIsBusy(d, busy)) return false
  return true
}

export function BookingWidget({ cabin, today, busy, rates = [], initialCheckIn, initialCheckOut, initialGuests, before, after }: Props) {
  const validInitial =
    initialCheckIn &&
    initialCheckOut &&
    initialCheckIn >= today &&
    initialCheckOut > initialCheckIn &&
    rangeFree(initialCheckIn, initialCheckOut, busy)

  const [checkIn, setCheckIn] = useState<string | null>(validInitial ? initialCheckIn! : null)
  const [checkOut, setCheckOut] = useState<string | null>(validInitial ? initialCheckOut! : null)
  const [guests, setGuests] = useState(Math.min(Math.max(initialGuests || 2, 1), cabin.capacity))
  const [offset, setOffset] = useState(() =>
    validInitial ? Math.max(0, diffMonths(today, initialCheckIn!)) : 0,
  )
  const [hover, setHover] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(
    initialCheckIn && !validInitial ? 'Las fechas que buscabas no están disponibles en esta cabaña. Elige otras en el calendario.' : null,
  )

  const nights = checkIn && checkOut ? diffDays(checkIn, checkOut) : 0
  const q = checkIn && checkOut ? quote(cabin, checkIn, checkOut, rates) : null
  const subtotal = q?.subtotal ?? 0
  const total = q?.total ?? 0
  const priceSet = q ? !q.unpriced : cabin.price_per_night > 0 || rates.length > 0
  const fromPrice = Math.min(...[cabin.price_per_night, ...rates.map((r) => r.price_per_night)].filter((p) => p > 0))

  const months = useMemo(() => {
    const first = addMonths(today, offset)
    return [first, addMonths(first, 1)]
  }, [today, offset])

  function pick(d: string) {
    setMessage(null)
    if (!checkIn || (checkIn && checkOut)) {
      if (nightIsBusy(d, busy)) return
      setCheckIn(d)
      setCheckOut(null)
      return
    }
    if (d <= checkIn) {
      if (nightIsBusy(d, busy)) return
      setCheckIn(d)
      return
    }
    if (!rangeFree(checkIn, d, busy)) {
      if (nightIsBusy(d, busy)) {
        setMessage('Hay noches ocupadas entre esas fechas.')
        return
      }
      setCheckIn(d)
      setMessage('Hay noches ocupadas entre esas fechas. Empecemos de nuevo desde aquí.')
      return
    }
    const minN = quote(cabin, checkIn, d, rates).minNights
    if (diffDays(checkIn, d) < minN) {
      setMessage(`Para esas fechas la estadía mínima es de ${minN} noches.`)
      return
    }
    setCheckOut(d)
  }

  function dayState(d: string) {
    const past = d < today
    const busyNight = nightIsBusy(d, busy)
    const selectingOut = !!checkIn && !checkOut
    const canBeCheckout = selectingOut && d > checkIn! && rangeFree(checkIn!, d, busy)
    const disabled = past || (busyNight && !canBeCheckout)
    const end = checkOut ?? (selectingOut && hover && hover > checkIn! && rangeFree(checkIn!, hover, busy) ? hover : null)
    const isStart = d === checkIn
    const isEnd = !!end && d === end
    const inRange = !!checkIn && !!end && d > checkIn && d < end
    return { past, busyNight, disabled, isStart, isEnd, inRange }
  }

  const reserveHref =
    checkIn && checkOut
      ? `/reservar?${new URLSearchParams({ cabana: cabin.slug, llegada: checkIn, salida: checkOut, huespedes: String(guests) })}`
      : null

  return (
    <div className="flex flex-wrap items-start gap-16">
      <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-14">
      {before}
      <section aria-labelledby="disp-title">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h2 id="disp-title" className="font-display text-[42px] font-medium">Disponibilidad</h2>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Meses anteriores"
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - 1))}
              className="fx-ghost flex h-11 w-11 items-center justify-center rounded-full border border-cream/25 disabled:opacity-30"
            >
              <IconChevronLeft size={16} strokeWidth={2.4} />
            </button>
            <button
              type="button"
              aria-label="Meses siguientes"
              disabled={offset >= MAX_MONTHS_AHEAD - 2}
              onClick={() => setOffset((o) => Math.min(MAX_MONTHS_AHEAD - 2, o + 1))}
              className="fx-ghost flex h-11 w-11 items-center justify-center rounded-full border border-cream/25 disabled:opacity-30"
            >
              <IconChevronRight size={16} strokeWidth={2.4} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-10" onMouseLeave={() => setHover(null)}>
          {months.map((m) => {
            const lead = weekdayMondayFirst(startOfMonth(m))
            const count = daysInMonth(m)
            return (
              <div key={m}>
                <p className="mb-3.5 text-center text-base font-bold">{formatMonth(m)}</p>
                <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label={formatMonth(m)}>
                  {WEEKDAYS.map((w) => (
                    <span key={w} className="py-1.5 text-xs font-semibold text-muted">{w}</span>
                  ))}
                  {Array.from({ length: lead }).map((_, i) => <span key={`e${i}`} />)}
                  {Array.from({ length: count }).map((_, i) => {
                    const d = startOfMonth(m).slice(0, 8) + String(i + 1).padStart(2, '0')
                    const s = dayState(d)
                    let cls = 'text-cream'
                    if (s.past) cls = 'text-muted/40'
                    else if (s.busyNight && s.disabled) cls = 'bg-surface-2 text-[#9E9386] line-through'
                    if (s.inRange) cls = 'bg-amber/20 text-cream'
                    if (s.isStart || s.isEnd) cls = 'bg-amber text-amber-ink'
                    return (
                      <button
                        key={d}
                        type="button"
                        disabled={s.disabled}
                        onClick={() => pick(d)}
                        onMouseEnter={() => setHover(d)}
                        aria-pressed={s.isStart || s.isEnd}
                        aria-label={`${formatDate(d)}${s.disabled && !s.past ? ', no disponible' : ''}`}
                        className={`fx-day rounded-full py-2.5 text-sm font-semibold disabled:cursor-not-allowed ${cls}`}
                      >
                        {i + 1}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-5 flex flex-wrap gap-5 text-[13px] text-sub">
          <span className="flex items-center gap-2"><span aria-hidden="true" className="h-3.5 w-3.5 rounded-full bg-amber" />Tus fechas</span>
          <span className="flex items-center gap-2"><span aria-hidden="true" className="h-3.5 w-3.5 rounded-full bg-surface-2" />No disponible</span>
        </div>
        {message && <p role="status" className="fx-up mt-4 text-sm text-amber-light">{message}</p>}
      </section>
      {after}
      </div>

      {/* Tarjeta de reserva: flota abajo en celular */}
      <aside
        aria-label={`Reservar ${cabin.name}`}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 p-4 backdrop-blur md:sticky md:top-8 md:z-auto md:min-w-0 md:flex-[1_1_360px] md:rounded-2xl md:border md:p-7"
      >
        <div className="hidden md:block">
          {priceSet ? (
            <p className="text-[15px] text-sub">
              {fromPrice !== cabin.price_per_night && 'desde '}
              <strong className="font-display text-[40px] font-semibold text-cream">{formatCLP(Number.isFinite(fromPrice) ? fromPrice : cabin.price_per_night)}</strong> / noche
            </p>
          ) : (
            <p className="text-[15px] text-sub">Precio por confirmar</p>
          )}
          <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-xl border border-cream/20">
            <div className="border-r border-cream/20 px-3.5 py-3">
              <p className="text-[11px] uppercase tracking-[2px] text-muted">Llegada</p>
              <p className="mt-1 text-base">{checkIn ? formatDate(checkIn) : 'Elige en el calendario'}</p>
            </div>
            <div className="px-3.5 py-3">
              <p className="text-[11px] uppercase tracking-[2px] text-muted">Salida</p>
              <p className="mt-1 text-base">{checkOut ? formatDate(checkOut) : '—'}</p>
            </div>
            <label className="col-span-2 flex flex-col gap-1 border-t border-cream/20 px-3.5 py-3">
              <span className="text-[11px] uppercase tracking-[2px] text-muted">Huéspedes</span>
              <select value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="fx-field bg-surface p-0 text-base text-cream">
                {Array.from({ length: cabin.capacity }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n} {n === 1 ? 'persona' : 'personas'}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 md:mt-5 md:block">
          <div className="md:hidden">
            {nights ? (
              <>
                <p className="font-bold">{priceSet ? formatCLP(total) + ' total' : 'Precio por confirmar'}</p>
                <p className="text-[13px] text-sub">{formatDate(checkIn!)} → {formatDate(checkOut!)} · {nights} {nights === 1 ? 'noche' : 'noches'}</p>
              </>
            ) : (
              <p className="text-sm text-sub">{checkIn ? 'Elige la fecha de salida' : 'Elige tus fechas'}</p>
            )}
          </div>
          {reserveHref && priceSet ? (
            <Link href={reserveHref} className="fx-btn flex min-h-[52px] items-center justify-center rounded-full bg-amber px-7 font-bold text-amber-ink md:w-full md:rounded-xl">
              Reservar
            </Link>
          ) : (
            <button type="button" disabled className="fx-btn flex min-h-[52px] items-center justify-center rounded-full bg-amber px-7 font-bold text-amber-ink md:w-full md:rounded-xl">
              {priceSet ? 'Reservar' : 'Pronto disponible'}
            </button>
          )}
        </div>

        {nights > 0 && priceSet && (
          <div className="fx-up mt-5 hidden flex-col gap-2.5 text-[15px] text-sub md:flex">
            <div className="flex justify-between">
              <span>
                {nights} {nights === 1 ? 'noche' : 'noches'}
                {checkIn && subtotal !== nightPrice(cabin, checkIn, rates) * nights ? ' (precio según temporada)' : ` × ${formatCLP(nightPrice(cabin, checkIn!, rates))}`}
              </span>
              <span>{formatCLP(subtotal)}</span>
            </div>
            {cabin.cleaning_fee > 0 && (
              <div className="flex justify-between"><span>Limpieza</span><span>{formatCLP(cabin.cleaning_fee)}</span></div>
            )}
            <div className="flex justify-between border-t border-line pt-3 text-[17px] font-bold text-cream"><span>Total</span><span>{formatCLP(total)}</span></div>
          </div>
        )}
        <p className="mt-5 hidden items-center gap-2.5 text-[13px] text-muted md:flex">
          <IconLock size={18} className="shrink-0 text-amber" />
          Pago seguro con Mercado Pago. Precio directo, sin comisión de plataformas.
        </p>
      </aside>
    </div>
  )
}

function diffMonths(a: string, b: string) {
  return (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + (Number(b.slice(5, 7)) - Number(a.slice(5, 7)))
}
