import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AutoRefresh } from '@/components/auto-refresh'
import { IconChat, IconCheck, IconMail } from '@/components/icons'
import { processPayment } from '@/lib/confirm'
import { formatDateShort } from '@/lib/dates'
import { formatCLP } from '@/lib/money'
import { site } from '@/lib/site'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Booking } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Tu reserva', robots: { index: false } }

const UUID_RE = /^[0-9a-f-]{36}$/i

async function load(id: string) {
  const { data } = await supabaseAdmin().from('bookings').select('*, cabins(name, slug)').eq('id', id).maybeSingle()
  return data as (Booking & { cabins: { name: string; slug: string } }) | null
}

export default async function BookingStatusPage(props: PageProps<'/reserva/[id]'>) {
  const { id } = await props.params
  const sp = await props.searchParams
  if (!UUID_RE.test(id)) notFound()

  let booking = await load(id)
  if (!booking) notFound()

  // Al volver de Mercado Pago llega ?payment_id=…: confirmamos sin esperar el webhook.
  const paymentId = typeof sp.payment_id === 'string' ? sp.payment_id : null
  if (booking.status !== 'confirmed' && paymentId && /^\d+$/.test(paymentId)) {
    await processPayment(paymentId).catch((e) => console.error(e))
    booking = (await load(id))!
  }

  const confirmed = booking.status === 'confirmed'
  const mpRejected = sp.status === 'rejected' || sp.collection_status === 'rejected'
  const returnedFromMP = !!paymentId || sp.status === 'approved' || sp.collection_status === 'approved'
  const waiting = booking.status === 'pending' && !mpRejected && returnedFromMP
  const retryHref = `/cabanas/${booking.cabins.slug}?llegada=${booking.check_in}&salida=${booking.check_out}&huespedes=${booking.guests}`

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-5 py-20">
      <Image src="/fotos/dusk_sea.jpg" alt="" aria-hidden fill sizes="100vw" className="object-cover" />
      <div aria-hidden="true" className="absolute inset-0 bg-ink/75" />
      {waiting && <AutoRefresh />}

      <div className="fx-up relative flex w-full max-w-[640px] flex-col items-center gap-6 rounded-[22px] border border-cream/15 bg-surface/90 p-8 text-center backdrop-blur-md md:p-12">
        {confirmed ? (
          <span aria-hidden="true" className="fx-check flex h-[72px] w-[72px] items-center justify-center rounded-full bg-amber text-amber-ink">
            <IconCheck size={34} strokeWidth={2.6} />
          </span>
        ) : waiting ? (
          <span aria-hidden="true" className="fx-spin h-16 w-16 rounded-full border-4 border-amber/25 border-t-amber" />
        ) : null}

        <div>
          <h1 className="font-display text-[clamp(40px,4.4vw,60px)] font-medium leading-none">
            {confirmed ? '¡Reserva confirmada!' : waiting ? 'Confirmando tu pago…' : 'El pago no se completó'}
          </h1>
          <p className="mt-3.5 text-[17px] leading-relaxed text-sub">
            {confirmed
              ? `Te esperamos en ${site.name}. Enviamos el comprobante a ${booking.guest_email}.`
              : waiting
                ? 'Esto toma unos segundos. No cierres esta página.'
                : 'Tus fechas quedaron liberadas. Puedes intentarlo de nuevo cuando quieras.'}
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-4 rounded-[14px] bg-ink p-5 text-left">
          <div><p className="text-[11px] uppercase tracking-[2px] text-muted">Código</p><p className="mt-1 text-[17px] font-bold text-amber">{booking.code}</p></div>
          <div><p className="text-[11px] uppercase tracking-[2px] text-muted">Cabaña</p><p className="mt-1 text-[17px] font-semibold">{booking.cabins.name}</p></div>
          <div><p className="text-[11px] uppercase tracking-[2px] text-muted">Fechas</p><p className="mt-1 text-[17px] font-semibold">{formatDateShort(booking.check_in)} → {formatDateShort(booking.check_out)}</p></div>
          <div><p className="text-[11px] uppercase tracking-[2px] text-muted">{confirmed ? 'Pagado' : 'Total'}</p><p className="mt-1 text-[17px] font-semibold">{formatCLP(booking.total)}</p></div>
        </div>

        {confirmed && (
          <ul className="flex w-full flex-col gap-3.5 text-left text-[15px] text-sub">
            <li className="flex items-start gap-3"><IconMail size={20} className="mt-0.5 shrink-0 text-amber" />Revisa tu correo: ahí tienes el detalle de la reserva.</li>
            <li className="flex items-start gap-3"><IconChat size={20} className="mt-0.5 shrink-0 text-amber" />Antes de tu llegada te escribimos por WhatsApp con las indicaciones y el check-in.</li>
          </ul>
        )}

        <div className="flex w-full flex-wrap justify-center gap-3">
          {confirmed ? (
            <>
              <a href={site.mapsHref} target="_blank" rel="noreferrer" className="fx-btn flex min-h-[52px] flex-[1_1_200px] items-center justify-center rounded-full bg-amber font-bold text-amber-ink">Cómo llegar</a>
              <a href={`/api/reserva/${booking.id}/ics`} className="fx-ghost flex min-h-[52px] flex-[1_1_200px] items-center justify-center rounded-full border border-cream/35 font-semibold">Agregar a mi calendario</a>
            </>
          ) : !waiting ? (
            <>
              <Link href={retryHref} className="fx-btn flex min-h-[52px] flex-[1_1_200px] items-center justify-center rounded-full bg-amber font-bold text-amber-ink">Intentar de nuevo</Link>
              <a href={site.whatsappHref} target="_blank" rel="noreferrer" className="fx-ghost flex min-h-[52px] flex-[1_1_200px] items-center justify-center rounded-full border border-cream/35 font-semibold">Escríbenos por WhatsApp</a>
            </>
          ) : null}
        </div>
        <Link href="/" className="fx-link text-sm text-amber">Volver al inicio</Link>
      </div>
    </main>
  )
}
