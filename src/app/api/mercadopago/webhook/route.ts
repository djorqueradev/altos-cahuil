import { NextResponse } from 'next/server'
import { processPayment } from '@/lib/confirm'
import { verifyWebhookSignature } from '@/lib/mercadopago'

// Mercado Pago avisa aquí cada cambio de un pago.
export async function POST(req: Request) {
  const url = new URL(req.url)
  const body = (await req.json().catch(() => ({}))) as { type?: string; topic?: string; data?: { id?: string | number } }
  const type = body.type || body.topic || url.searchParams.get('type') || url.searchParams.get('topic')
  const dataId = String(url.searchParams.get('data.id') || body.data?.id || url.searchParams.get('id') || '')

  if (type !== 'payment' || !dataId) return NextResponse.json({ ignored: true })
  if (!verifyWebhookSignature(req, dataId)) {
    return NextResponse.json({ error: 'firma inválida' }, { status: 401 })
  }

  try {
    await processPayment(dataId)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('webhook MP', e)
    // 500 => Mercado Pago reintenta más tarde
    return NextResponse.json({ error: 'error procesando' }, { status: 500 })
  }
}
