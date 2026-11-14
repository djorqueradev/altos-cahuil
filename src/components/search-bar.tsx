'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { DatePicker } from '@/components/date-picker'
import { addDays } from '@/lib/dates'

type Props = {
  cabins: { slug: string; name: string }[]
  today: string
  maxGuests: number
  className?: string
}

const labelCls = 'text-[11px] uppercase tracking-[2px] text-muted'
const fieldCls = 'fx-field w-full rounded-md border border-transparent bg-transparent p-0 text-base text-cream'

export function SearchBar({ cabins, today, maxGuests, className = '' }: Props) {
  const router = useRouter()
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState('2')
  const [cabin, setCabin] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const q = new URLSearchParams()
    if (checkIn) q.set('llegada', checkIn)
    if (checkOut) q.set('salida', checkOut)
    q.set('huespedes', guests)
    router.push(cabin ? `/cabanas/${cabin}?${q}` : `/cabanas?${q}`)
  }

  return (
    <form
      onSubmit={submit}
      aria-label="Buscar disponibilidad"
      className={`flex max-w-[1100px] flex-wrap items-stretch rounded-[20px] border border-cream/20 bg-surface/80 p-2.5 backdrop-blur-md ${className}`}
    >
      <div className="flex min-w-[45%] flex-1 basis-[180px] flex-col gap-1.5 border-line px-5 py-3 md:border-r">
        <span className={labelCls} aria-hidden="true">Llegada</span>
        <DatePicker
          aria-label="Llegada"
          min={today}
          value={checkIn}
          onChange={(v) => {
            setCheckIn(v)
            if (!checkOut || checkOut <= v) setCheckOut(addDays(v, 2))
          }}
          className={fieldCls}
        />
      </div>
      <div className="flex min-w-[45%] flex-1 basis-[180px] flex-col gap-1.5 border-line px-5 py-3 md:border-r">
        <span className={labelCls} aria-hidden="true">Salida</span>
        <DatePicker
          aria-label="Salida"
          min={checkIn ? addDays(checkIn, 1) : addDays(today, 1)}
          openTo={checkIn || undefined}
          value={checkOut}
          onChange={setCheckOut}
          className={fieldCls}
        />
      </div>
      <label className="flex min-w-[45%] flex-1 basis-[160px] flex-col gap-1.5 border-line px-5 py-3 md:border-r">
        <span className={labelCls}>Huéspedes</span>
        <select value={guests} onChange={(e) => setGuests(e.target.value)} className={`${fieldCls} bg-surface`}>
          {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? 'persona' : 'personas'}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-[45%] flex-1 basis-[160px] flex-col gap-1.5 px-5 py-3">
        <span className={labelCls}>Cabaña</span>
        <select value={cabin} onChange={(e) => setCabin(e.target.value)} className={`${fieldCls} bg-surface`}>
          <option value="">Cualquiera</option>
          {cabins.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="fx-btn mt-2 min-h-16 w-full rounded-[14px] bg-amber px-8 text-base font-bold text-amber-ink md:mt-0 md:w-auto md:flex-[0_1_220px]"
      >
        Ver disponibilidad
      </button>
    </form>
  )
}
