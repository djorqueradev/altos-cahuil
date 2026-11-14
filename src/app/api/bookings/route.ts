import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCabin } from '@/lib/data'
import { isISODate } from '@/lib/dates'
import { createPreference } from '@/lib/mercadopago'
import { site } from '@/lib/site'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { syncChannels } from '@/lib/sync'
import type { Booking } from '@/lib/types'

const Body = z.object({
  cabin: z.string().min(1).max(60),
  checkIn: z.string().refine(isISODate, 'Fecha inválida'),
  checkOut: z.string().refine(isISODate, 'Fecha inválida'),
  guests: z.number().int().min(1).max(20),
  firstName: z.string().trim().min(1, 'Ingresa tu nombre').max(80),
  lastName: z.string().trim().min(1, 'Ingresa tu apellido').max(80),
  email: z.string().trim().email('Correo inválido').max(160),
  phone: z.string().trim().min(8, 'Teléfono inválido').max(30),
  document: z.string().trim().max(30).optional().nullable(),
  arrivalWindow: z.string().trim().max(60).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
})

const ERRORS: Record<string, string> = {
  CABIN_NOT_FOUND: 'La cabaña no existe.',
  INVALID_DATES: 'Las fechas no son válidas.',
  PAST_DATES: 'La fecha de llegada ya pasó.',
  NOT_AVAILABLE: 'Lo sentimos, esas fechas se acaban de ocupar. Elige otras.',
  PRICE_NOT_SET: 'Esta cabaña aún no tiene precio configurado. Escríbenos para reservar.',
}

function friendly(message: string): string {
  const [code, arg] = message.split(':')
  if (code === 'MIN_NIGHTS') return `La estadía mínima es de ${arg} noches.`
  if (code === 'TOO_MANY_GUESTS') return `Esta cabaña recibe hasta ${arg} personas.`
  return ERRORS[code] ?? 'No pudimos crear la reserva. Inténtalo de nuevo.'
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  }
  const b = parsed.data

  const cabin = await getCabin(b.cabin)
  if (!cabin) return NextResponse.json({ error: ERRORS.CABIN_NOT_FOUND }, { status: 404 })

  // Trae lo último de Booking/Airbnb antes de bloquear las fechas (si tarda, seguimos igual).
  await Promise.race([syncChannels(cabin.id).catch(() => null), new Promise((r) => setTimeout(r, 6000))])

  const db = supabaseAdmin()
  const { data, error } = await db.rpc('create_direct_booking', {
    p_cabin_slug: cabin.slug,
    p_check_in: b.checkIn,
    p_check_out: b.checkOut,
    p_guests: b.guests,
    p_first_name: b.firstName,
    p_last_name: b.lastName,
    p_email: b.email,
    p_phone: b.phone,
    p_document: b.document ?? '',
    p_arrival_window: b.arrivalWindow ?? '',
    p_notes: b.notes ?? '',
    p_hold_minutes: site.paymentHoldMinutes,
  })
  if (error) {
    return NextResponse.json({ error: friendly(error.message) }, { status: error.message.startsWith('NOT_AVAILABLE') ? 409 : 400 })
  }
  const booking = data as Booking

  try {
    const pref = await createPreference(booking, cabin.name)
    await db.from('bookings').update({ mp_preference_id: pref.id }).eq('id', booking.id)
    const useSandbox = process.env.MP_USE_SANDBOX === 'true'
    return NextResponse.json({
      bookingId: booking.id,
      checkoutUrl: useSandbox ? pref.sandbox_init_point : pref.init_point,
    })
  } catch (e) {
    console.error(e)
    // Libera las fechas si no pudimos abrir el pago
    await db.from('bookings').update({ status: 'cancelled', admin_alert: 'No se pudo crear el pago en Mercado Pago' }).eq('id', booking.id)
    return NextResponse.json({ error: 'No pudimos conectar con Mercado Pago. Inténtalo en unos minutos.' }, { status: 502 })
  }
}
