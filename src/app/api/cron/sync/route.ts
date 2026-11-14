import { NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { expirePendingBookings, syncChannels } from '@/lib/sync'

/**
 * Tarea programada: importa los calendarios de Booking/Airbnb y libera reservas sin pagar.
 * Llamar con el header  Authorization: Bearer <CRON_SECRET>  (Vercel Cron lo envía solo).
 */
export async function GET(req: Request) {
  const secret = env.cronSecret()
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'no autorizado' }, { status: 401 })
  }
  await expirePendingBookings()
  const results = await syncChannels()
  return NextResponse.json({ ok: true, results })
}
