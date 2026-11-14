import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { env } from '@/lib/env'
import type { Booking } from '@/lib/types'

// Checkout Pro con la API de Orders de Mercado Pago.
// https://www.mercadopago.cl/developers/es/docs/checkout-pro-orders/create-order

const API = 'https://api.mercadopago.com'

async function mp<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(API + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.mpAccessToken()}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`Mercado Pago ${res.status}: ${JSON.stringify(body).slice(0, 500)}`)
  }
  return body as T
}

export type MPOrder = {
  id: string
  status: string // created | processed | action_required | failed | expired | canceled | refunded …
  status_detail: string // accredited cuando el pago fue acreditado
  external_reference: string | null
  total_amount: string
  total_paid_amount?: string
  currency?: string
  checkout_url?: string
  transactions?: { payments?: { id: string; status: string; status_detail: string; amount: string; paid_amount?: string }[] }
}

/** Crea la order de Checkout Pro para una reserva pendiente y devuelve su checkout_url. */
export async function createOrder(booking: Booking, cabinName: string, holdMinutes = 30): Promise<MPOrder> {
  const siteUrl = env.siteUrl()
  const back = `${siteUrl}/reserva/${booking.id}`
  const isPublicUrl = siteUrl.startsWith('https://')
  const amount = String(Math.round(booking.total)) // CLP: entero, sin decimales

  return mp<MPOrder>('/v1/orders', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': `order-${booking.id}` },
    body: JSON.stringify({
      type: 'online',
      processing_mode: 'manual',
      capture_mode: 'automatic', // resultado binario: aprobado o rechazado
      total_amount: amount,
      external_reference: booking.id,
      expiration_time: `PT${holdMinutes}M`,
      description: `Reserva ${booking.code} · ${cabinName}`,
      payer: {
        email: booking.guest_email,
        first_name: booking.guest_first_name,
        last_name: booking.guest_last_name,
      },
      items: [
        {
          external_code: booking.code,
          title: `${cabinName} · ${booking.nights} ${booking.nights === 1 ? 'noche' : 'noches'} (${booking.check_in} → ${booking.check_out})`,
          description: `Reserva ${booking.code} en Altos de Cahuil`,
          category_id: 'travels',
          quantity: 1,
          unit_price: amount,
        },
      ],
      config: {
        statement_descriptor: 'ALTOS CAHUIL',
        online: {
          success_url: back,
          failure_url: back,
          pending_url: back,
          ...(isPublicUrl ? { auto_return: 'approved' } : {}),
        },
      },
    }),
  })
}

export function getOrder(id: string) {
  return mp<MPOrder>(`/v1/orders/${encodeURIComponent(id)}`)
}

/** ¿La order quedó pagada? */
export function orderIsPaid(o: MPOrder): boolean {
  return o.status === 'processed' && o.status_detail === 'accredited'
}

/**
 * Verifica la firma x-signature de Mercado Pago.
 * https://www.mercadopago.cl/developers/es/docs/checkout-pro-orders/notifications
 * Si no hay secreto configurado devuelve true (igual se consulta la order a la API, que es la fuente de verdad).
 */
export function verifyWebhookSignature(req: Request, dataId: string): boolean {
  const secret = env.mpWebhookSecret()
  if (!secret) return true
  const signature = req.headers.get('x-signature') || ''
  const requestId = req.headers.get('x-request-id') || ''
  let ts = ''
  let v1 = ''
  for (const part of signature.split(',')) {
    const eq = part.indexOf('=')
    if (eq < 0) continue
    const k = part.slice(0, eq).trim()
    const v = part.slice(eq + 1).trim()
    if (k === 'ts') ts = v
    if (k === 'v1') v1 = v
  }
  if (!ts || !v1) return false
  const parts: string[] = []
  if (dataId) parts.push(`id:${dataId.toLowerCase()}`)
  if (requestId) parts.push(`request-id:${requestId}`)
  parts.push(`ts:${ts}`)
  const manifest = parts.join(';') + ';'
  const expected = createHmac('sha256', secret).update(manifest).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(v1)
  return a.length === b.length && timingSafeEqual(a, b)
}
