import type { Metadata } from 'next'
import { getRates } from '@/lib/data'
import { addDays, addMonths, isISODate, startOfMonth, todayInChile } from '@/lib/dates'
import { MonthCalendar } from '../../_components/month-calendar'
import { PageHeader } from '../../_components/ui'
import { loadOccupancy } from '../../_lib/queries'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Calendario' }

export default async function CalendarPage(props: PageProps<'/admin/calendario'>) {
  const sp = await props.searchParams
  const today = todayInChile()
  const mesParam = typeof sp.mes === 'string' ? `${sp.mes}-01` : ''
  const month = isISODate(mesParam) ? mesParam : startOfMonth(today)
  const view = typeof sp.vista === 'string' && sp.vista ? sp.vista : 'todas'

  // Margen de una semana a cada lado para las semanas que asoman de otros meses
  const from = addDays(month, -7)
  const to = addDays(addMonths(month, 1), 7)
  const [{ items, bookings }, rates] = await Promise.all([loadOccupancy(from, to), getRates({ from })])

  return (
    <>
      <PageHeader title="Calendario" subtitle="Reservas web, manuales, de Booking y Airbnb, y bloqueos en un solo lugar." />
      <MonthCalendar month={month} today={today} view={view} items={items} bookings={bookings} rates={rates} />
    </>
  )
}
