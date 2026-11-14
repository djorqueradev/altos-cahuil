import 'server-only'
import { addDays, todayInChile } from '@/lib/dates'
import { env } from '@/lib/env'
import { getSettings, type Settings } from '@/lib/settings'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Booking } from '@/lib/types'
import {
  guestAbandoned,
  guestCancelled,
  guestConfirmed,
  guestReminder,
  guestThanks,
  ownerAbandoned,
  ownerAlert,
  ownerNew,
  type Email,
  type EmailCabin,
} from '@/lib/emails/templates'

export type SendResult = { ok: true; id?: string } | { ok: false; error: string }

export const isEmail = (s: string | null | undefined): s is string => !!s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())

/** Envía con Resend. Si falta RESEND_API_KEY no hace nada (y lo informa). */
export async function sendEmail(
  to: string | string[],
  email: Email,
  opts: { replyTo?: string; idempotencyKey?: string; tag?: string } = {},
): Promise<SendResult> {
  const key = env.resendApiKey()
  if (!key) return { ok: false, error: 'Falta configurar RESEND_API_KEY en Vercel.' }
  const recipients = (Array.isArray(to) ? to : [to]).map((x) => x.trim()).filter(isEmail)
  if (!recipients.length) return { ok: false, error: 'No hay un correo de destino válido.' }
  const replyTo = opts.replyTo ?? (await getSettings()).contact_email
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...(opts.idempotencyKey ? { 'Idempotency-Key': opts.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: env.emailFrom(),
        to: recipients,
        subject: email.subject,
        html: email.html,
        text: email.text,
        reply_to: isEmail(replyTo) ? replyTo : undefined,
        tags: opts.tag ? [{ name: 'tipo', value: opts.tag }] : undefined,
      }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error('Resend error', res.status, body)
      return { ok: false, error: (body as { message?: string }).message ?? `Error ${res.status} de Resend` }
    }
    return { ok: true, id: (body as { id?: string }).id }
  } catch (e) {
    console.error('Resend error', e)
    return { ok: false, error: 'No se pudo conectar con Resend.' }
  }
}

/** A quién le llegan los avisos internos: lista del panel → OWNER_EMAIL → correo de contacto. */
export function ownerRecipients(s: Settings): string[] {
  const raw = s.notify_emails.trim() || env.ownerEmail() || s.contact_email
  return raw.split(/[,;\s]+/).filter(isEmail)
}

type BookingWithCabin = Booking & { cabins?: EmailCabin | null }

function ctxFor(b: BookingWithCabin, settings: Settings, cabin?: EmailCabin) {
  return {
    siteUrl: env.siteUrl(),
    settings,
    booking: b,
    cabin: cabin ?? b.cabins ?? { name: 'Cabaña', slug: '' },
  }
}

async function cabinOf(cabinId: string): Promise<EmailCabin> {
  const { data } = await supabaseAdmin().from('cabins').select('name, slug').eq('id', cabinId).maybeSingle()
  return (data as EmailCabin | null) ?? { name: 'Cabaña', slug: '' }
}

const wantsGuestEmails = (b: Booking) => b.send_emails !== false && isEmail(b.guest_email)

/* ---------------- disparadores ---------------- */

/** Pago aprobado en la web: confirmación al huésped + aviso a ustedes. */
export async function sendBookingConfirmed(b: Booking, cabinName: string) {
  const s = await getSettings()
  const cabin = await cabinOf(b.cabin_id).then((c) => ({ ...c, name: c.name || cabinName }))
  const ctx = ctxFor(b, s, cabin)
  if (wantsGuestEmails(b)) await sendEmail(b.guest_email, guestConfirmed(ctx), { idempotencyKey: `confirmed/${b.id}`, tag: 'confirmada' })
  if (b.source === 'direct') {
    await sendEmail(ownerRecipients(s), ownerNew(ctx), { replyTo: isEmail(b.guest_email) ? b.guest_email : undefined, idempotencyKey: `owner-new/${b.id}`, tag: 'aviso-reserva' })
  }
}

/** Reenvía (o envía por primera vez) la confirmación de una reserva desde el panel. */
export async function resendConfirmation(bookingId: string): Promise<SendResult> {
  const { data } = await supabaseAdmin().from('bookings').select('*, cabins(name, slug)').eq('id', bookingId).maybeSingle()
  const b = data as BookingWithCabin | null
  if (!b) return { ok: false, error: 'Reserva no encontrada.' }
  if (b.status !== 'confirmed') return { ok: false, error: 'Solo se puede enviar la confirmación de reservas confirmadas.' }
  if (!isEmail(b.guest_email)) return { ok: false, error: 'La reserva no tiene un correo válido.' }
  return sendEmail(b.guest_email, guestConfirmed(ctxFor(b, await getSettings())), { tag: 'confirmada' })
}

export async function sendBookingCancelled(bookingId: string): Promise<SendResult | null> {
  const { data } = await supabaseAdmin().from('bookings').select('*, cabins(name, slug)').eq('id', bookingId).maybeSingle()
  const b = data as BookingWithCabin | null
  if (!b || !wantsGuestEmails(b)) return null
  return sendEmail(b.guest_email, guestCancelled(ctxFor(b, await getSettings())), { idempotencyKey: `cancelled/${b.id}`, tag: 'cancelada' })
}

/** Reservas web cuyo plazo de pago venció: correo para reintentar + aviso a ustedes. */
export async function sendAbandonedEmails(rows: BookingWithCabin[]) {
  const direct = rows.filter((b) => b.source === 'direct' && !b.admin_alert)
  if (!direct.length) return
  const s = await getSettings()
  const db = supabaseAdmin()
  for (const b of direct) {
    // Si después hizo otra reserva (por ejemplo, con otras fechas), no le insistimos.
    const { count } = await db
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('guest_email', b.guest_email)
      .in('status', ['pending', 'confirmed'])
      .gt('created_at', b.created_at)
    if (count) continue
    const ctx = ctxFor(b, s)
    if (s.email_abandoned && wantsGuestEmails(b)) await sendEmail(b.guest_email, guestAbandoned(ctx), { idempotencyKey: `abandoned/${b.id}`, tag: 'pago-no-completado' })
    await sendEmail(ownerRecipients(s), ownerAbandoned(ctx), { replyTo: isEmail(b.guest_email) ? b.guest_email : undefined, idempotencyKey: `owner-abandoned/${b.id}`, tag: 'aviso-sin-pago' })
  }
}

export async function sendOwnerAlert(subject: string, text: string, booking?: Booking) {
  const s = await getSettings()
  const cabin = booking ? await cabinOf(booking.cabin_id) : undefined
  await sendEmail(ownerRecipients(s), ownerAlert({ siteUrl: env.siteUrl(), settings: s }, subject, text, booking, cabin), { tag: 'alerta' })
}

/** Hora actual en Chile (0–23). */
function chileHour() {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Santiago', hour: 'numeric', hourCycle: 'h23' }).format(new Date()))
}

/**
 * Recordatorios antes de la llegada y agradecimientos después de la salida.
 * Se llama desde la tarea programada; solo envía entre 9:00 y 21:00 (hora de Chile)
 * y marca cada reserva para no repetir el correo.
 */
export async function runScheduledEmails() {
  const hour = chileHour()
  if (hour < 9 || hour >= 21) return { skipped: 'fuera de horario', reminders: 0, thanks: 0 }
  if (!env.resendApiKey()) return { skipped: 'sin RESEND_API_KEY', reminders: 0, thanks: 0 }
  const s = await getSettings()
  const db = supabaseAdmin()
  const today = todayInChile()
  let reminders = 0
  let thanks = 0

  if (s.email_reminders) {
    const dayAgo = new Date(Date.now() - 86_400_000).toISOString()
    const { data } = await db
      .from('bookings')
      .select('*, cabins(name, slug)')
      .eq('status', 'confirmed')
      .eq('send_emails', true)
      .is('reminder_sent_at', null)
      .gte('check_in', addDays(today, 1))
      .lte('check_in', addDays(today, s.reminder_days))
      .lt('created_at', dayAgo)
      .limit(50)
    for (const b of (data ?? []) as BookingWithCabin[]) {
      if (!isEmail(b.guest_email)) continue
      const { data: claimed } = await db.from('bookings').update({ reminder_sent_at: new Date().toISOString() }).eq('id', b.id).is('reminder_sent_at', null).select('id')
      if (!claimed?.length) continue
      const r = await sendEmail(b.guest_email, guestReminder(ctxFor(b, s), today), { tag: 'recordatorio' })
      if (r.ok) reminders++
      else await db.from('bookings').update({ reminder_sent_at: null }).eq('id', b.id)
    }
  }

  if (s.email_thanks) {
    const { data } = await db
      .from('bookings')
      .select('*, cabins(name, slug)')
      .eq('status', 'confirmed')
      .eq('send_emails', true)
      .is('thanks_sent_at', null)
      .gte('check_out', addDays(today, -3))
      .lte('check_out', addDays(today, -1))
      .limit(50)
    for (const b of (data ?? []) as BookingWithCabin[]) {
      if (!isEmail(b.guest_email)) continue
      const { data: claimed } = await db.from('bookings').update({ thanks_sent_at: new Date().toISOString() }).eq('id', b.id).is('thanks_sent_at', null).select('id')
      if (!claimed?.length) continue
      const r = await sendEmail(b.guest_email, guestThanks(ctxFor(b, s)), { tag: 'gracias' })
      if (r.ok) thanks++
      else await db.from('bookings').update({ thanks_sent_at: null }).eq('id', b.id)
    }
  }
  return { reminders, thanks }
}
