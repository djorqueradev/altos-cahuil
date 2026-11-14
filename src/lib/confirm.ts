import 'server-only'
import { sendBookingConfirmed, sendOwnerAlert } from '@/lib/email'
import { getOrder, orderIsPaid } from '@/lib/mercadopago'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Booking } from '@/lib/types'

/**
 * Consulta una order de Mercado Pago y, si está pagada y cuadra con la reserva, la confirma.
 * Es idempotente: se puede llamar varias veces (webhook + regreso del huésped).
 */
export async function processOrder(orderId: string): Promise<Booking | null> {
  const order = await getOrder(orderId)
  const bookingId = order.external_reference
  if (!bookingId) return null

  const db = supabaseAdmin()
  const { data } = await db.from('bookings').select('*, cabins(name)').eq('id', bookingId).maybeSingle()
  if (!data) return null
  const b = data as Booking & { cabins: { name: string } | null }
  const cabinName = b.cabins?.name ?? 'Cabaña'

  if (!orderIsPaid(order) || b.status === 'confirmed') return b

  const paymentId = order.transactions?.payments?.[0]?.id ?? order.id
  const paid = Math.round(Number(order.total_paid_amount ?? order.total_amount))
  if ((order.currency && order.currency !== 'CLP') || paid < b.total) {
    await db
      .from('bookings')
      .update({ mp_payment_id: paymentId, admin_alert: `Monto pagado (${paid} ${order.currency ?? ''}) no coincide con el total` })
      .eq('id', b.id)
    await sendOwnerAlert(`Revisar pago de reserva ${b.code}`, 'El monto pagado no coincide con el total de la reserva.')
    return b
  }

  const { data: updated, error } = await db
    .from('bookings')
    .update({
      status: 'confirmed',
      mp_order_id: order.id,
      mp_payment_id: paymentId,
      amount_paid: paid,
      payment_method: 'mercadopago',
      paid_at: new Date().toISOString(),
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
    await db.from('bookings').update({ mp_payment_id: paymentId, admin_alert: alert }).eq('id', b.id)
    await sendOwnerAlert(`URGENTE: reserva ${b.code} pagada sin fechas`, alert)
    return b
  }
  if (updated) {
    await sendBookingConfirmed(updated as Booking, cabinName).catch((e) => console.error(e))
    return updated as Booking
  }
  return b
}
