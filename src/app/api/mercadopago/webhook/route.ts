import { NextResponse } from 'next/server'
import { processOrder } from '@/lib/confirm'
import { verifyWebhookSignature } from '@/lib/mercadopago'

// Mercado Pago avisa aquí cada cambio de una order (evento "Order (Mercado Pago)").
export async function POST(req: Request) {
  const url = new URL(req.url)
  const body = (await req.json().catch(() => ({}))) as { type?: string; data?: { id?: string } }
  const type = body.type || url.searchParams.get('type')
  const dataId = String(url.searchParams.get('data.id') || body.data?.id || '')

  if (type !== 'order' || !dataId) return NextResponse.json({ ignored: true })
  if (!verifyWebhookSignature(req, url.searchParams.get('data.id') || dataId)) {
    return NextResponse.json({ error: 'firma inválida' }, { status: 401 })
  }

  try {
    await processOrder(dataId)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('webhook MP', e)
    // 500 => Mercado Pago reintenta más tarde
    return NextResponse.json({ error: 'error procesando' }, { status: 500 })
  }
}
