import Link from 'next/link'
import { IconChevronLeft, IconChevronRight } from '@/components/icons'
import { getAllCabinsAdmin } from '@/lib/data'
import { addDays, daysInMonth, diffDays, formatDateShort, isISODate, startOfMonth, todayInChile, weekdayMondayFirst } from '@/lib/dates'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { syncNow } from '../actions'
import { Flash, card, ghost } from './flash'

export const dynamic = 'force-dynamic'

const DAYS = 21
const WD = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']

type Bar = { cabin_id: string; start: string; end: string; label: string; kind: 'direct' | 'manual' | 'pending' | 'booking' | 'airbnb' | 'block' }

const KIND_STYLE: Record<Bar['kind'], string> = {
  direct: 'bg-amber text-amber-ink',
  manual: 'bg-[#C98A4F] text-amber-ink',
  pending: 'border border-dashed border-amber text-amber-light bg-amber/10',
  booking: 'bg-[#3D6FD6] text-white',
  airbnb: 'bg-[#7A3B35] text-[#FFE9E5] ring-1 ring-inset ring-[#E6837A]',
  block: 'bg-[repeating-linear-gradient(45deg,#3A332C_0_6px,#24201C_6px_12px)] text-sub',
}

export default async function AdminCalendar(props: PageProps<'/admin'>) {
  const sp = await props.searchParams
  const today = todayInChile()
  const from = typeof sp.desde === 'string' && isISODate(sp.desde) ? sp.desde : addDays(today, -weekdayMondayFirst(today))
  const to = addDays(from, DAYS)
  const db = supabaseAdmin()
  const cabins = await getAllCabinsAdmin()
  const nowIso = new Date().toISOString()

  const monthStart = startOfMonth(today)
  const monthEnd = addDays(monthStart, daysInMonth(today))
  const rangeFrom = from < monthStart ? from : monthStart
  const rangeTo = to > monthEnd ? to : monthEnd

  const [bookings, blocks, external, feeds, alerts, arrivals] = await Promise.all([
    db.from('bookings').select('id, cabin_id, check_in, check_out, status, source, expires_at, guest_first_name, guest_last_name, code').in('status', ['confirmed', 'pending']).lt('check_in', rangeTo).gt('check_out', rangeFrom),
    db.from('blocks').select('cabin_id, start_date, end_date, reason').lt('start_date', rangeTo).gt('end_date', rangeFrom),
    db.from('external_events').select('cabin_id, channel, start_date, end_date').lt('start_date', rangeTo).gt('end_date', rangeFrom),
    db.from('channel_feeds').select('channel, last_synced_at, last_status, cabin_id'),
    db.from('bookings').select('id', { count: 'exact', head: true }).not('admin_alert', 'is', null),
    db.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'confirmed').gte('check_in', today).lt('check_in', addDays(today, 7)),
  ])

  const bars: Bar[] = [
    ...(bookings.data ?? [])
      .filter((b) => b.status === 'confirmed' || (b.expires_at && b.expires_at > nowIso))
      .map((b) => ({
        cabin_id: b.cabin_id,
        start: b.check_in,
        end: b.check_out,
        label: `${b.guest_first_name} ${b.guest_last_name}`.trim(),
        kind: (b.status === 'pending' ? 'pending' : b.source) as Bar['kind'],
      })),
    ...(blocks.data ?? []).map((k) => ({ cabin_id: k.cabin_id, start: k.start_date, end: k.end_date, label: k.reason, kind: 'block' as const })),
    ...(external.data ?? []).map((e) => ({ cabin_id: e.cabin_id, start: e.start_date, end: e.end_date, label: e.channel === 'booking' ? 'Booking' : 'Airbnb', kind: e.channel as Bar['kind'] })),
  ]

  // Indicadores del mes en curso
  const monthDays = daysInMonth(today)
  let busyNights = 0
  let directNights = 0
  let soldNights = 0
  for (const c of cabins.filter((c) => c.active)) {
    for (let d = monthStart; d < monthEnd; d = addDays(d, 1)) {
      const hit = bars.find((b) => b.cabin_id === c.id && d >= b.start && d < b.end && b.kind !== 'pending')
      if (hit) {
        busyNights++
        if (hit.kind !== 'block') soldNights++
        if (hit.kind === 'direct') directNights++
      }
    }
  }
  const activeCount = cabins.filter((c) => c.active).length || 1
  const occupancy = Math.round((busyNights / (monthDays * activeCount)) * 100)
  const directShare = soldNights ? Math.round((directNights / soldNights) * 100) : 0

  const days = Array.from({ length: DAYS }, (_, i) => addDays(from, i))
  const lastSync = (feeds.data ?? []).map((f) => f.last_synced_at).filter(Boolean).sort().pop()
  const feedErrors = (feeds.data ?? []).filter((f) => f.last_status && f.last_status !== 'ok').length

  return (
    <div className="fx-up flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[40px] font-medium leading-none">Calendario</h1>
          <p className="mt-2 text-sm text-sub">
            {formatDateShort(from)} – {formatDateShort(addDays(to, -1))}
            {lastSync && <> · Canales sincronizados {new Date(lastSync).toLocaleString('es-CL', { timeZone: 'America/Santiago', dateStyle: 'short', timeStyle: 'short' })}</>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href={`/admin?desde=${addDays(from, -7)}`} aria-label="Semana anterior" className={`${ghost} flex w-10 items-center justify-center px-0`}><IconChevronLeft size={16} /></Link>
          <Link href="/admin" className={`${ghost} flex items-center`}>Hoy</Link>
          <Link href={`/admin?desde=${addDays(from, 7)}`} aria-label="Semana siguiente" className={`${ghost} flex w-10 items-center justify-center px-0`}><IconChevronRight size={16} /></Link>
          <form action={syncNow}>
            <input type="hidden" name="redirectTo" value="/admin" />
            <button type="submit" className={ghost}>Sincronizar canales</button>
          </form>
          <Link href="/admin/bloqueos" className={`${ghost} flex items-center`}>Bloquear fechas</Link>
          <Link href="/admin/reservas#nueva" className="fx-btn flex min-h-[40px] items-center rounded-full bg-amber px-4 text-[13px] font-bold text-amber-ink">+ Nueva reserva</Link>
        </div>
      </div>

      <Flash sp={sp} />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,190px),1fr))] gap-3.5">
        {[
          ['Ocupación del mes', `${occupancy}%`, ''],
          ['Noches vendidas (mes)', String(soldNights), ''],
          ['Llegadas próximos 7 días', String(arrivals.count ?? 0), ''],
          ['Reservas directas (mes)', `${directShare}%`, 'text-amber'],
        ].map(([k, v, c]) => (
          <div key={k} className={`fx-tile ${card} p-5`}>
            <p className="text-[13px] text-sub">{k}</p>
            <p className={`mt-2 text-[30px] font-bold ${c}`}>{v}</p>
          </div>
        ))}
      </div>

      {((alerts.count ?? 0) > 0 || feedErrors > 0) && (
        <div className="flex flex-col gap-2">
          {(alerts.count ?? 0) > 0 && (
            <Link href="/admin/reservas?filtro=alertas" className="rounded-xl border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber-light">
              Hay {alerts.count} reserva(s) que requieren tu atención →
            </Link>
          )}
          {feedErrors > 0 && (
            <Link href="/admin/canales" className="rounded-xl border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber-light">
              {feedErrors} calendario(s) de Booking/Airbnb no se pudieron leer en la última sincronización →
            </Link>
          )}
        </div>
      )}

      <div className={`${card} overflow-x-auto p-5`}>
        <div className="grid min-w-[980px] gap-y-2.5" style={{ gridTemplateColumns: `130px repeat(${DAYS}, minmax(0, 1fr))` }}>
          <span />
          {days.map((d) => (
            <span key={d} className={`border-b border-line pb-2 text-center text-xs text-muted ${d === today ? 'text-amber' : ''}`}>
              <span className="block font-medium">{WD[weekdayMondayFirst(d)]}</span>
              <span className={`block text-[15px] font-bold ${d === today ? 'text-amber' : 'text-cream'}`}>{Number(d.slice(8))}</span>
            </span>
          ))}
          {cabins.map((c, row) => (
            <div key={c.id} className="contents">
              <span className="self-center text-sm font-semibold" style={{ gridRow: row + 2, gridColumn: 1 }}>
                {c.name}
              </span>
              {bars
                .filter((b) => b.cabin_id === c.id && b.start < to && b.end > from)
                .map((b, i) => {
                  const s = Math.max(0, diffDays(from, b.start))
                  const e = Math.min(DAYS, diffDays(from, b.end))
                  return (
                    <span
                      key={i}
                      title={`${b.label} · ${b.start} → ${b.end}`}
                      className={`fx-bar mx-0.5 truncate rounded-lg px-2.5 py-3 text-[13px] font-semibold ${KIND_STYLE[b.kind]}`}
                      style={{ gridRow: row + 2, gridColumn: `${s + 2} / ${e + 2}` }}
                    >
                      {b.label}
                    </span>
                  )
                })}
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-5 text-[13px] text-sub">
          {[
            ['Directa (web)', KIND_STYLE.direct],
            ['Manual', KIND_STYLE.manual],
            ['Esperando pago', KIND_STYLE.pending],
            ['Booking', KIND_STYLE.booking],
            ['Airbnb', KIND_STYLE.airbnb],
            ['Bloqueado', KIND_STYLE.block],
          ].map(([k, cls]) => (
            <span key={k} className="flex items-center gap-2"><span aria-hidden="true" className={`h-3.5 w-3.5 rounded ${cls}`} />{k}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
