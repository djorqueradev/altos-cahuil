'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { isISODate } from '@/lib/dates'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { supabaseServer } from '@/lib/supabase/server'
import { syncChannels } from '@/lib/sync'

function back(path: string, params: Record<string, string>): never {
  redirect(`${path}?${new URLSearchParams(params)}`)
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim()
const int = (fd: FormData, k: string) => Math.max(0, Math.round(Number(str(fd, k).replace(/[^\d]/g, '')) || 0))

export async function signOut() {
  const supabase = await supabaseServer()
  await supabase.auth.signOut()
  redirect('/admin/login')
}

export async function syncNow(fd: FormData) {
  await requireAdmin()
  const results = await syncChannels()
  const failed = results.filter((r) => !r.ok)
  revalidatePath('/admin', 'layout')
  const to = str(fd, 'redirectTo') || '/admin'
  if (!results.length) back(to, { error: 'Aún no has configurado calendarios de Booking o Airbnb.' })
  if (failed.length) back(to, { error: `No se pudo leer ${failed.length} calendario(s): ${failed[0].error}` })
  back(to, { ok: `Sincronizado: ${results.reduce((n, r) => n + r.events, 0)} reservas importadas de los canales.` })
}

// ---------------------------------------------------------------- Bloqueos
export async function createBlock(fd: FormData) {
  await requireAdmin()
  const cabinIds = fd.getAll('cabin_id').map(String).filter(Boolean)
  const start = str(fd, 'start_date')
  const end = str(fd, 'end_date')
  const reason = str(fd, 'reason') || 'Bloqueado'
  if (!cabinIds.length || !isISODate(start) || !isISODate(end) || end <= start) {
    back('/admin/bloqueos', { error: 'Revisa las fechas: la fecha de término debe ser posterior al inicio.' })
  }
  const { error } = await supabaseAdmin()
    .from('blocks')
    .insert(cabinIds.map((cabin_id) => ({ cabin_id, start_date: start, end_date: end, reason: reason.slice(0, 120) })))
  if (error) back('/admin/bloqueos', { error: error.message })
  revalidatePath('/admin', 'layout')
  back('/admin/bloqueos', { ok: 'Fechas bloqueadas.' })
}

export async function deleteBlock(fd: FormData) {
  await requireAdmin()
  await supabaseAdmin().from('blocks').delete().eq('id', str(fd, 'id'))
  revalidatePath('/admin', 'layout')
  back('/admin/bloqueos', { ok: 'Bloqueo eliminado.' })
}

// ---------------------------------------------------------------- Cabañas
export async function updateCabin(fd: FormData) {
  await requireAdmin()
  const id = str(fd, 'id')
  const amenities = str(fd, 'amenities').split('\n').map((s) => s.trim()).filter(Boolean)
  const { error } = await supabaseAdmin()
    .from('cabins')
    .update({
      name: str(fd, 'name'),
      short_description: str(fd, 'short_description'),
      description: str(fd, 'description'),
      capacity: Math.max(1, int(fd, 'capacity')),
      bedrooms_summary: str(fd, 'bedrooms_summary'),
      price_per_night: int(fd, 'price_per_night'),
      cleaning_fee: int(fd, 'cleaning_fee'),
      min_nights: Math.max(1, int(fd, 'min_nights')),
      amenities,
      active: fd.get('active') === 'on',
    })
    .eq('id', id)
  if (error) back('/admin/cabanas', { error: error.message })
  revalidatePath('/', 'layout')
  back('/admin/cabanas', { ok: 'Cambios guardados.' })
}

// ---------------------------------------------------------------- Canales
export async function saveFeed(fd: FormData) {
  await requireAdmin()
  const cabin_id = str(fd, 'cabin_id')
  const channel = str(fd, 'channel')
  const ical_url = str(fd, 'ical_url')
  if (!['booking', 'airbnb'].includes(channel)) back('/admin/canales', { error: 'Canal inválido' })
  const db = supabaseAdmin()
  if (!ical_url) {
    await db.from('channel_feeds').delete().eq('cabin_id', cabin_id).eq('channel', channel)
    revalidatePath('/admin', 'layout')
    back('/admin/canales', { ok: 'Calendario desconectado.' })
  }
  if (!/^https:\/\//i.test(ical_url)) back('/admin/canales', { error: 'La URL debe comenzar con https://' })
  const { error } = await db.from('channel_feeds').upsert({ cabin_id, channel, ical_url }, { onConflict: 'cabin_id,channel' })
  if (error) back('/admin/canales', { error: error.message })
  const results = await syncChannels(cabin_id)
  const mine = results.find((r) => r.channel === channel)
  revalidatePath('/admin', 'layout')
  if (mine && !mine.ok) back('/admin/canales', { error: `Guardado, pero no se pudo leer el calendario: ${mine.error}` })
  back('/admin/canales', { ok: `Calendario conectado (${mine?.events ?? 0} reservas importadas).` })
}

// ---------------------------------------------------------------- Reservas
export async function cancelBooking(fd: FormData) {
  await requireAdmin()
  await supabaseAdmin().from('bookings').update({ status: 'cancelled', expires_at: null }).eq('id', str(fd, 'id'))
  revalidatePath('/admin', 'layout')
  back('/admin/reservas', { ok: 'Reserva cancelada. Si correspondía, recuerda hacer el reembolso en Mercado Pago.' })
}

export async function clearAlert(fd: FormData) {
  await requireAdmin()
  await supabaseAdmin().from('bookings').update({ admin_alert: null }).eq('id', str(fd, 'id'))
  revalidatePath('/admin', 'layout')
  back('/admin/reservas', { ok: 'Alerta marcada como resuelta.' })
}

const Manual = z.object({
  cabin_id: z.string().uuid(),
  check_in: z.string().refine(isISODate),
  check_out: z.string().refine(isISODate),
  guests: z.coerce.number().int().min(1).max(20),
  guest_first_name: z.string().min(1),
  guest_last_name: z.string().default(''),
  guest_email: z.string().default(''),
  guest_phone: z.string().default(''),
  total: z.preprocess((v) => String(v ?? '0').replace(/[^\d]/g, '') || '0', z.coerce.number().int().min(0)),
  notes: z.string().default(''),
})

export async function createManualBooking(fd: FormData) {
  await requireAdmin()
  const parsed = Manual.safeParse(Object.fromEntries(fd))
  if (!parsed.success || parsed.data.check_out <= parsed.data.check_in) {
    back('/admin/reservas', { error: 'Revisa los datos de la reserva manual (fechas, nombre, huéspedes).' })
  }
  const m = parsed.data
  const db = supabaseAdmin()
  const { data: busy } = await db.rpc('cabin_busy_ranges', { p_cabin: m.cabin_id, p_from: m.check_in, p_to: m.check_out })
  if (busy && busy.length) back('/admin/reservas', { error: 'Esas fechas ya están ocupadas en esa cabaña.' })
  const nights = Math.round((Date.parse(m.check_out) - Date.parse(m.check_in)) / 86_400_000)
  const { error } = await db.from('bookings').insert({
    ...m,
    guest_last_name: m.guest_last_name || '-',
    guest_email: m.guest_email || '-',
    guest_phone: m.guest_phone || '-',
    notes: m.notes || null,
    price_per_night: nights ? Math.round(m.total / nights) : m.total,
    subtotal: m.total,
    cleaning_fee: 0,
    status: 'confirmed',
    source: 'manual',
    paid_at: new Date().toISOString(),
  })
  if (error) back('/admin/reservas', { error: error.message.includes('bookings_no_overlap') ? 'Esas fechas ya están ocupadas.' : error.message })
  revalidatePath('/admin', 'layout')
  back('/admin/reservas', { ok: 'Reserva manual creada.' })
}
