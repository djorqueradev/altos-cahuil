import 'server-only'
import { sendBookingConfirmed, sendOwnerAlert } from '@/lib/email'
import { getPayment } from '@/lib/mercadopago'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Booking } from '@/lib/types'

/**
 * Consulta un pago en Mercado Pago y, si está aprobado y cuadra con la reserva, la confirma.
 * Es idempotente: se puede llamar varias veces (webhook + regreso del huésped).
 */
export async function processPayment(paymentId: string | number): Promise<Booking | null> {
  const payment = await getPayment(paymentId)
  const bookingId = payment.external_reference
  if (!bookingId) return null

  const db = supabaseAdmin()
  const { data: booking } = await db.from('bookings').select('*, cabins(name)').eq('id', bookingId).maybeSingle()
  if (!booking) return null
  const b = booking as Booking & { cabins: { name: string } | null }
  const cabinName = b.cabins?.name ?? 'Cabaña'

  if (payment.status !== 'approved') return b
  if (b.status === 'confirmed') return b

  if (payment.currency_id !== 'CLP' || Math.round(payment.transaction_amount) < b.total) {
    await db
      .from('bookings')
      .update({ mp_payment_id: String(payment.id), admin_alert: `Monto pagado (${payment.transaction_amount} ${payment.currency_id}) no coincide con el total` })
      .eq('id', b.id)
    await sendOwnerAlert(`Revisar pago de reserva ${b.code}`, 'El monto pagado no coincide con el total de la reserva.')
    return b
  }

  const { data: updated, error } = await db
    .from('bookings')
    .update({
      status: 'confirmed',
      mp_payment_id: String(payment.id),
      paid_at: payment.date_approved ?? new Date().toISOString(),
      expires_at: null,
      admin_alert: null,
    })
    .eq('id', b.id)
    .in('status', ['pending', 'expired', 'cancelled'])
    .select('*')
    .maybeSingle()

  if (error) {
    // Lo más probable: el pago llegó tarde y otra reserva ya tomó esas fechas.
    const alert = 'Pago aprobado pero las fechas ya están ocupadas: contactar al huésped y reembolsar.'
    await db.from('bookings').update({ mp_payment_id: String(payment.id), admin_alert: alert }).eq('id', b.id)
    await sendOwnerAlert(`URGENTE: reserva ${b.code} pagada sin fechas`, alert)
    return b
  }
  if (updated) {
    await sendBookingConfirmed(updated as Booking, cabinName).catch((e) => console.error(e))
    return updated as Booking
  }
  return b
}
