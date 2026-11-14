import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { env } from '@/lib/env'
import type { Booking } from '@/lib/types'

const API = 'https://api.mercadopago.com'

async function mp<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(API + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.mpAccessToken()}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`Mercado Pago ${res.status}: ${JSON.stringify(body).slice(0, 400)}`)
  }
  return body as T
}

type Preference = { id: string; init_point: string; sandbox_init_point: string }

/** Crea la preferencia de Checkout Pro para una reserva pendiente. */
export async function createPreference(booking: Booking, cabinName: string): Promise<Preference> {
  const site = env.siteUrl()
  const back = `${site}/reserva/${booking.id}`
  const isPublicUrl = site.startsWith('https://')
  return mp<Preference>('/checkout/preferences', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': `pref-${booking.id}` },
    body: JSON.stringify({
      items: [
        {
          id: booking.code,
          title: `${cabinName} · ${booking.nights} ${booking.nights === 1 ? 'noche' : 'noches'} (${booking.check_in} → ${booking.check_out})`,
          description: `Reserva ${booking.code} en Altos de Cahuil`,
          category_id: 'travels',
          quantity: 1,
          currency_id: 'CLP',
          unit_price: booking.total,
        },
      ],
      payer: {
        name: booking.guest_first_name,
        surname: booking.guest_last_name,
        email: booking.guest_email,
      },
      external_reference: booking.id,
      statement_descriptor: 'ALTOS CAHUIL',
      ...(isPublicUrl ? { notification_url: `${site}/api/mercadopago/webhook` } : {}),
      back_urls: { success: back, pending: back, failure: back },
      ...(isPublicUrl ? { auto_return: 'approved' } : {}),
      expires: true,
      ...(booking.expires_at
        ? { expiration_date_to: new Date(booking.expires_at).toISOString().replace('Z', '+00:00') }
        : {}),
      binary_mode: true, // aprobado o rechazado, sin pagos "en proceso" que retengan las fechas
    }),
  })
}

export type MPPayment = {
  id: number
  status: string
  status_detail: string
  external_reference: string | null
  transaction_amount: number
  currency_id: string
  date_approved: string | null
}

export function getPayment(id: string | number) {
  return mp<MPPayment>(`/v1/payments/${id}`)
}

/**
 * Verifica la firma x-signature de Mercado Pago.
 * https://www.mercadopago.cl/developers/es/docs/your-integrations/notifications/webhooks
 * Si no hay secreto configurado, devuelve true (igual se consulta el pago a la API, que es la fuente de verdad).
 */
export function verifyWebhookSignature(req: Request, dataId: string): boolean {
  const secret = env.mpWebhookSecret()
  if (!secret) return true
  const signature = req.headers.get('x-signature') || ''
  const requestId = req.headers.get('x-request-id') || ''
  const parts = Object.fromEntries(
    signature.split(',').map((p) => {
      const [k, ...v] = p.trim().split('=')
      return [k, v.join('=')]
    }),
  )
  const ts = parts.ts
  const v1 = parts.v1
  if (!ts || !v1) return false
  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId
  const manifest = `id:${id};request-id:${requestId};ts:${ts};`
  const expected = createHmac('sha256', secret).update(manifest).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(v1))
  } catch {
    return false
  }
}
