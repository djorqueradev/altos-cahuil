import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllCabinsAdmin } from '@/lib/data'
import { todayInChile } from '@/lib/dates'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Booking } from '@/lib/types'
import { BookingsTable } from '../../_components/bookings-table'
import { QuickActions } from '../../_components/clickable'
import { PageHeader } from '../../_components/ui'
import { toAdminBooking } from '../../_lib/queries'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Reservas' }

const FILTERS = [
  { id: 'proximas', label: 'Próximas y en curso' },
  { id: 'cobrar', label: 'Por cobrar' },
  { id: 'pasadas', label: 'Pasadas' },
  { id: 'canceladas', label: 'Canceladas / no pagadas' },
  { id: 'alertas', label: 'Con alertas' },
  { id: 'todas', label: 'Todas' },
]

export default async function ReservationsPage(props: PageProps<'/admin/reservas'>) {
  const sp = await props.searchParams
  const filtro = typeof sp.filtro === 'string' && FILTERS.some((f) => f.id === sp.filtro) ? sp.filtro : 'proximas'
  const cabana = typeof sp.cabana === 'string' ? sp.cabana : ''
  const today = todayInChile()
  const cabins = await getAllCabinsAdmin()

  let q = supabaseAdmin().from('bookings').select('*, cabins(name)').limit(500)
  if (cabana) {
    const c = cabins.find((x) => x.slug === cabana)
    if (c) q = q.eq('cabin_id', c.id)
  }
  if (filtro === 'proximas') q = q.gte('check_out', today).in('status', ['confirmed', 'pending']).order('check_in')
  else if (filtro === 'cobrar') q = q.eq('status', 'confirmed').order('check_in')
  else if (filtro === 'pasadas') q = q.lt('check_out', today).eq('status', 'confirmed').order('check_in', { ascending: false })
  else if (filtro === 'canceladas') q = q.in('status', ['cancelled', 'expired']).order('created_at', { ascending: false })
  else if (filtro === 'alertas') q = q.not('admin_alert', 'is', null).order('created_at', { ascending: false })
  else q = q.order('check_in', { ascending: false })
  const { data } = await q
  let rows = ((data ?? []) as (Booking & { cabins: { name: string } | null })[]).map(toAdminBooking)
  if (filtro === 'cobrar') rows = rows.filter((b) => b.amount_paid < b.total)

  const href = (f: string, c: string) => `/admin/reservas?${new URLSearchParams({ filtro: f, ...(c ? { cabana: c } : {}) })}`

  return (
    <>
      <PageHeader title="Reservas" subtitle="Toca una reserva para ver el detalle, cobrar, escribir por WhatsApp o cancelar." actions={<QuickActions />} />
      <div className="mb-4 flex flex-col gap-3">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {FILTERS.map((f) => (
            <Link
              key={f.id}
              href={href(f.id, cabana)}
              className={`flex min-h-9 shrink-0 items-center rounded-full border px-3.5 text-[13px] font-semibold ${filtro === f.id ? 'border-amber bg-amber/15 text-amber-light' : 'border-cream/15 text-sub hover:text-cream'}`}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[{ slug: '', name: 'Todas las cabañas' }, ...cabins].map((c) => (
            <Link
              key={c.slug || 'all'}
              href={href(filtro, c.slug)}
              className={`flex min-h-8 items-center rounded-full px-3 text-xs font-semibold ${cabana === c.slug ? 'bg-surface-2 text-cream' : 'text-muted hover:text-cream'}`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      </div>
      <BookingsTable bookings={rows} />
      <p className="mt-4 text-xs text-muted">Las reservas de Booking y Airbnb se ven en el calendario; sus datos y pagos se gestionan en cada plataforma.</p>
    </>
  )
}
