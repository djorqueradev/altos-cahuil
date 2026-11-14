// Precio por noche según temporadas. Misma regla que la función SQL public.night_price:
// gana la temporada específica de la cabaña sobre la general; entre iguales, la que empieza más tarde.
import { addDays, diffDays } from '@/lib/dates'

export type Rate = {
  id: string
  cabin_id: string | null
  label: string
  start_date: string
  end_date: string // exclusivo
  price_per_night: number
  min_nights: number | null
}

export type PriceBase = { id: string; price_per_night: number; cleaning_fee: number; min_nights: number }

export function rateFor(cabinId: string, date: string, rates: Rate[]): Rate | null {
  const hits = rates.filter((r) => (r.cabin_id === cabinId || r.cabin_id === null) && date >= r.start_date && date < r.end_date)
  hits.sort((a, b) => {
    if ((a.cabin_id === null) !== (b.cabin_id === null)) return a.cabin_id === null ? 1 : -1
    return a.start_date < b.start_date ? 1 : -1
  })
  return hits[0] ?? null
}

export function nightPrice(cabin: PriceBase, date: string, rates: Rate[]): number {
  return rateFor(cabin.id, date, rates)?.price_per_night ?? cabin.price_per_night
}

export type Quote = { nights: number; subtotal: number; cleaningFee: number; total: number; minNights: number; unpriced: boolean }

export function quote(cabin: PriceBase, checkIn: string, checkOut: string, rates: Rate[]): Quote {
  const nights = Math.max(0, diffDays(checkIn, checkOut))
  let subtotal = 0
  let unpriced = false
  for (let d = checkIn; d < checkOut; d = addDays(d, 1)) {
    const p = nightPrice(cabin, d, rates)
    if (p <= 0) unpriced = true
    subtotal += p
  }
  const minFromRates = rates
    .filter((r) => (r.cabin_id === cabin.id || r.cabin_id === null) && r.start_date < checkOut && r.end_date > checkIn)
    .reduce((m, r) => Math.max(m, r.min_nights ?? 1), 1)
  return {
    nights,
    subtotal,
    cleaningFee: cabin.cleaning_fee,
    total: subtotal + cabin.cleaning_fee,
    minNights: Math.max(cabin.min_nights, minFromRates),
    unpriced,
  }
}
