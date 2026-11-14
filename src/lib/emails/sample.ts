import 'server-only'
import { addDays, todayInChile } from '@/lib/dates'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Booking } from '@/lib/types'
import type { EmailCabin } from './templates'

/** Reserva de ejemplo para la vista previa y los correos de prueba. */
export async function sampleBooking(): Promise<{ booking: Booking; cabin: EmailCabin }> {
  const { data } = await supabaseAdmin()
    .from('cabins')
    .select('id, name, slug, price_per_night, cleaning_fee')
    .eq('active', true)
    .order('sort_order')
    .limit(1)
    .maybeSingle()
  const c = (data ?? { id: '00000000-0000-0000-0000-000000000000', name: 'Cabaña 1', slug: 'cabana-1', price_per_night: 0, cleaning_fee: 0 }) as {
    id: string
    name: string
    slug: string
    price_per_night: number
    cleaning_fee: number
  }
  const today = todayInChile()
  const nights = 3
  const price = c.price_per_night || 85000
  const cleaning = c.cleaning_fee || 0
  const subtotal = price * nights
  const booking: Booking = {
    id: '00000000-0000-4000-8000-000000000000',
    code: 'AC-7K3M9P',
    cabin_id: c.id,
    check_in: addDays(today, 2),
    check_out: addDays(today, 2 + nights),
    guests: 4,
    guest_first_name: 'Camila',
    guest_last_name: 'Rojas',
    guest_email: 'camila@ejemplo.cl',
    guest_phone: '+56 9 1234 5678',
    guest_document: null,
    arrival_window: 'Entre 17:00 y 19:00',
    notes: 'Vamos con un perro pequeño. ¿Hay leña para la chimenea?',
    nights,
    price_per_night: price,
    subtotal,
    cleaning_fee: cleaning,
    total: subtotal + cleaning,
    status: 'confirmed',
    source: 'direct',
    expires_at: null,
    mp_order_id: null,
    mp_payment_id: null,
    paid_at: new Date().toISOString(),
    admin_alert: null,
    amount_paid: subtotal + cleaning,
    payment_method: 'mercadopago',
    internal_notes: null,
    send_emails: true,
    created_at: new Date().toISOString(),
  }
  return { booking, cabin: { name: c.name, slug: c.slug } }
}
