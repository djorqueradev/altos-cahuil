import Link from 'next/link'
import { getAllCabinsAdmin } from '@/lib/data'
import { formatDateShort, todayInChile } from '@/lib/dates'
import { formatCLP } from '@/lib/money'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Booking } from '@/lib/types'
import { cancelBooking, clearAlert, createManualBooking } from '../../actions'
import { ConfirmSubmit } from '../confirm-submit'
import { Flash, btn, card, ghost, inputCls, labelCls } from '../flash'

export const dynamic = 'force-dynamic'

const STATUS: Record<string, [string, string]> = {
  confirmed: ['Confirmada', 'bg-[#1F3A2A] text-[#A7E3BC]'],
  pending: ['Esperando pago', 'bg-amber/15 text-amber-light'],
  cancelled: ['Cancelada', 'bg-surface-2 text-muted'],
  expired: ['No pagó', 'bg-surface-2 text-muted'],
}

const FILTERS = [
  { id: 'proximas', label: 'Próximas' },
  { id: 'pasadas', label: 'Pasadas' },
  { id: 'todas', label: 'Todas' },
  { id: 'alertas', label: 'Con alertas' },
]

export default async function ReservationsPage(props: PageProps<'/admin/reservas'>) {
  const sp = await props.searchParams
  const filtro = typeof sp.filtro === 'string' ? sp.filtro : 'proximas'
  const today = todayInChile()
  const cabins = await getAllCabinsAdmin()
  const cabinName = Object.fromEntries(cabins.map((c) => [c.id, c.name]))

  let q = supabaseAdmin().from('bookings').select('*').limit(200)
  if (filtro === 'proximas') q = q.gte('check_out', today).in('status', ['confirmed', 'pending']).order('check_in')
  else if (filtro === 'pasadas') q = q.lt('check_out', today).eq('status', 'confirmed').order('check_in', { ascending: false })
  else if (filtro === 'alertas') q = q.not('admin_alert', 'is', null).order('created_at', { ascending: false })
  else q = q.order('created_at', { ascending: false })
  const { data } = await q
  const rows = (data ?? []) as Booking[]

  return (
    <div className="fx-up flex flex-col gap-6">
      <h1 className="font-display text-[40px] font-medium leading-none">Reservas</h1>
      <Flash sp={sp} />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={`/admin/reservas?filtro=${f.id}`}
            className={`${ghost} flex items-center ${filtro === f.id ? 'border-amber bg-amber/10 text-amber-light' : ''}`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className={`${card} overflow-x-auto`}>
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[1.5px] text-muted">
              {['Código', 'Huésped', 'Cabaña', 'Fechas', 'Total', 'Estado', ''].map((h) => (
                <th key={h} className="px-5 py-3.5 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-muted">No hay reservas en esta vista.</td></tr>
            )}
            {rows.map((b) => {
              const [label, cls] = STATUS[b.status]
              return (
                <tr key={b.id} className="fx-row border-t border-line align-top">
                  <td className="px-5 py-4">
                    <span className="font-semibold text-amber">{b.code}</span>
                    <span className="block text-xs text-muted">{b.source === 'manual' ? 'Manual' : 'Web'}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-semibold">{b.guest_first_name} {b.guest_last_name}</span>
                    <span className="block text-xs text-muted">{b.guests} pers. · {b.guest_phone}</span>
                    <span className="block text-xs text-muted">{b.guest_email}</span>
                    {b.notes && <span className="mt-1 block max-w-[260px] text-xs text-sub">“{b.notes}”</span>}
                  </td>
                  <td className="px-5 py-4">{cabinName[b.cabin_id]}</td>
                  <td className="px-5 py-4">
                    {formatDateShort(b.check_in)} → {formatDateShort(b.check_out)}
                    <span className="block text-xs text-muted">{b.nights} noches{b.arrival_window ? ` · ${b.arrival_window}` : ''}</span>
                  </td>
                  <td className="px-5 py-4">
                    {formatCLP(b.total)}
                    {b.mp_payment_id && <span className="block text-xs text-muted">MP #{b.mp_payment_id}</span>}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{label}</span>
                    {b.admin_alert && <span className="mt-2 block max-w-[240px] text-xs text-amber-light">⚠ {b.admin_alert}</span>}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col items-start gap-2">
                      {b.admin_alert && (
                        <form action={clearAlert}>
                          <input type="hidden" name="id" value={b.id} />
                          <button type="submit" className={ghost}>Marcar resuelta</button>
                        </form>
                      )}
                      {(b.status === 'confirmed' || b.status === 'pending') && (
                        <form action={cancelBooking}>
                          <input type="hidden" name="id" value={b.id} />
                          <ConfirmSubmit message={`¿Cancelar la reserva ${b.code}? Las fechas quedarán libres.`} className={ghost}>
                            Cancelar
                          </ConfirmSubmit>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <section id="nueva" className={`${card} scroll-mt-8 p-6`}>
        <h2 className="text-lg font-bold">Nueva reserva manual</h2>
        <p className="mt-1 text-sm text-muted">Para reservas por teléfono, WhatsApp o transferencia. Queda confirmada y bloquea las fechas en todos los canales.</p>
        <form action={createManualBooking} className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-4">
          <label className={labelCls}>Cabaña
            <select name="cabin_id" required className={inputCls}>
              {cabins.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className={labelCls}>Llegada<input type="date" name="check_in" required min={today} className={inputCls} /></label>
          <label className={labelCls}>Salida<input type="date" name="check_out" required min={today} className={inputCls} /></label>
          <label className={labelCls}>Huéspedes<input type="number" name="guests" min={1} max={20} defaultValue={2} required className={inputCls} /></label>
          <label className={labelCls}>Nombre<input name="guest_first_name" required className={inputCls} /></label>
          <label className={labelCls}>Apellido<input name="guest_last_name" className={inputCls} /></label>
          <label className={labelCls}>Teléfono<input name="guest_phone" className={inputCls} /></label>
          <label className={labelCls}>Correo<input type="email" name="guest_email" className={inputCls} /></label>
          <label className={labelCls}>Total cobrado (CLP)<input name="total" inputMode="numeric" defaultValue="0" className={inputCls} /></label>
          <label className={`${labelCls} md:col-span-2`}>Notas<input name="notes" className={inputCls} /></label>
          <div className="flex items-end"><button type="submit" className={btn}>Crear reserva</button></div>
        </form>
      </section>
    </div>
  )
}
