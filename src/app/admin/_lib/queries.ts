import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Booking } from '@/lib/types'
import type { AdminBooking, CalItem } from '../_components/model'

type BookingRow = Booking & { cabins: { name: string } | null }

export function toAdminBooking(b: BookingRow): AdminBooking {
  const { cabins, ...rest } = b
  return { ...rest, cabin_name: cabins?.name ?? '' }
}

/** Todo lo que ocupa noches entre [from, to): reservas vigentes, bloqueos y eventos de Booking/Airbnb. */
export async function loadOccupancy(from: string, to: string) {
  const db = supabaseAdmin()
  const nowIso = new Date().toISOString()
  const [bookings, blocks, external] = await Promise.all([
    db.from('bookings').select('*, cabins(name)').in('status', ['confirmed', 'pending']).lt('check_in', to).gt('check_out', from).order('check_in'),
    db.from('blocks').select('id, cabin_id, start_date, end_date, reason').lt('start_date', to).gt('end_date', from),
    db.from('external_events').select('id, cabin_id, channel, start_date, end_date, summary').lt('start_date', to).gt('end_date', from),
  ])
  const live = ((bookings.data ?? []) as BookingRow[]).filter((b) => b.status === 'confirmed' || (b.expires_at && b.expires_at > nowIso))
  const adminBookings = live.map(toAdminBooking)

  const items: CalItem[] = [
    ...adminBookings.map<CalItem>((b) => ({
      key: `b-${b.id}`,
      kind: b.status === 'pending' ? 'pending' : b.source,
      cabinId: b.cabin_id,
      start: b.check_in,
      end: b.check_out,
      label: `${b.guest_first_name} ${b.guest_last_name !== '-' ? b.guest_last_name : ''}`.trim(),
      bookingId: b.id,
    })),
    ...(blocks.data ?? []).map<CalItem>((k) => ({
      key: `k-${k.id}`,
      kind: 'block',
      cabinId: k.cabin_id,
      start: k.start_date,
      end: k.end_date,
      label: k.reason,
      blockId: k.id,
      reason: k.reason,
    })),
    ...(external.data ?? []).map<CalItem>((e) => ({
      key: `e-${e.id}`,
      kind: e.channel as 'booking' | 'airbnb',
      cabinId: e.cabin_id,
      start: e.start_date,
      end: e.end_date,
      label: e.channel === 'booking' ? 'Booking.com' : 'Airbnb',
    })),
  ]
  return { items, bookings: adminBookings }
}

/** Noches ocupadas por cabaña y por tipo, dentro de [from, to). */
export function nightsBreakdown(items: CalItem[], from: string, to: string) {
  const byKind: Record<string, number> = {}
  let sold = 0
  let blocked = 0
  for (const it of items) {
    if (it.kind === 'pending') continue
    const s = it.start > from ? it.start : from
    const e = it.end < to ? it.end : to
    const n = Math.max(0, Math.round((Date.parse(e) - Date.parse(s)) / 86_400_000))
    if (!n) continue
    byKind[it.kind] = (byKind[it.kind] ?? 0) + n
    if (it.kind === 'block') blocked += n
    else sold += n
  }
  return { byKind, sold, blocked }
}
