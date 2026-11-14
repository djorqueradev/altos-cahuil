// Fechas como 'YYYY-MM-DD' (sin hora). Se opera en UTC para evitar saltos por horario de verano.

export type ISODate = string

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/

export function isISODate(v: unknown): v is ISODate {
  if (typeof v !== 'string' || !ISO_RE.test(v)) return false
  const d = new Date(v + 'T00:00:00Z')
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
}

export function toDate(d: ISODate): Date {
  return new Date(d + 'T00:00:00Z')
}

export function fromDate(d: Date): ISODate {
  return d.toISOString().slice(0, 10)
}

export function addDays(d: ISODate, n: number): ISODate {
  const x = toDate(d)
  x.setUTCDate(x.getUTCDate() + n)
  return fromDate(x)
}

export function diffDays(from: ISODate, to: ISODate): number {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / 86_400_000)
}

/** Hoy en Chile continental. */
export function todayInChile(): ISODate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  return parts // en-CA => YYYY-MM-DD
}

export function startOfMonth(d: ISODate): ISODate {
  return d.slice(0, 8) + '01'
}

export function addMonths(d: ISODate, n: number): ISODate {
  const x = toDate(startOfMonth(d))
  x.setUTCMonth(x.getUTCMonth() + n)
  return fromDate(x)
}

export function daysInMonth(d: ISODate): number {
  const x = toDate(startOfMonth(d))
  return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)).getUTCDate()
}

/** 0 = lunes … 6 = domingo */
export function weekdayMondayFirst(d: ISODate): number {
  return (toDate(d).getUTCDay() + 6) % 7
}

const fmtLong = new Intl.DateTimeFormat('es-CL', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
const fmtFull = new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const fmtShort = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const fmtMonth = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' })

export const formatDate = (d: ISODate) => fmtLong.format(toDate(d))
export const formatDateFull = (d: ISODate) => fmtFull.format(toDate(d))
export const formatDateShort = (d: ISODate) => fmtShort.format(toDate(d))
export const formatMonth = (d: ISODate) => {
  const s = fmtMonth.format(toDate(d))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export type Range = { start: ISODate; end: ISODate } // end exclusivo (día de salida)

export function rangesOverlap(a: Range, b: Range): boolean {
  return a.start < b.end && b.start < a.end
}

/** ¿La noche que comienza en `d` está ocupada? */
export function nightIsBusy(d: ISODate, busy: Range[]): boolean {
  return busy.some((r) => d >= r.start && d < r.end)
}
