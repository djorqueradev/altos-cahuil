import { NextResponse } from 'next/server'
import { runScheduledEmails } from '@/lib/email'
import { env } from '@/lib/env'
import { expirePendingBookings, syncChannels } from '@/lib/sync'

/**
 * Tarea programada: importa los calendarios de Booking/Airbnb libera reservas sin pagar
 * y envía los recordatorios / agradecimientos del día.
 * Llamar con el header  Authorization: Bearer <CRON_SECRET>  (Vercel Cron lo envía solo).
 */
export async function GET(req: Request) {
  const secret = env.cronSecret()
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'no autorizado' }, { status: 401 })
  }
  const expired = await expirePendingBookings()
  const results = await syncChannels()
  const emails = await runScheduledEmails().catch((e) => ({ error: String(e) }))
  return NextResponse.json({ ok: true, expired, results, emails })
}
