import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckoutForm } from '@/components/checkout-form'
import { IconCheck } from '@/components/icons'
import { getCabin, getQuote, isRangeFree } from '@/lib/data'
import { diffDays, formatDate, isISODate, todayInChile } from '@/lib/dates'
import { formatCLP } from '@/lib/money'
import { site } from '@/lib/site'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Completa tu reserva', robots: { index: false } }

export default async function CheckoutPage(props: PageProps<'/reservar'>) {
  const sp = await props.searchParams
  const slug = typeof sp.cabana === 'string' ? sp.cabana : ''
  const llegada = typeof sp.llegada === 'string' ? sp.llegada : ''
  const salida = typeof sp.salida === 'string' ? sp.salida : ''
  const cabin = slug ? await getCabin(slug) : null
  if (!cabin) redirect('/cabanas')

  const guests = Math.min(Math.max(Number(sp.huespedes) || 2, 1), cabin.capacity)
  const today = todayInChile()
  const validDates = isISODate(llegada) && isISODate(salida) && llegada >= today && salida > llegada
  if (!validDates) redirect(`/cabanas/${cabin.slug}`)
  const nights = diffDays(llegada, salida)
  const [free, q] = await Promise.all([isRangeFree(cabin.id, llegada, salida), getQuote(cabin.id, llegada, salida)])
  if (!free || nights < q.min_nights || q.has_unpriced) {
    redirect(`/cabanas/${cabin.slug}?llegada=${llegada}&salida=${salida}&huespedes=${guests}`)
  }
  const subtotal = q.subtotal
  const total = q.total

  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-5 px-5 py-6 md:px-[5%]">
          <Link href="/" className="font-display text-[28px] font-semibold">{site.name}</Link>
          <ol aria-label="Pasos de la reserva" className="flex flex-wrap items-center gap-3 text-sm font-semibold">
            <li className="flex items-center gap-2 text-sub">
              <span aria-hidden="true" className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[#3A332C] text-amber"><IconCheck size={12} strokeWidth={3} /></span>
              Fechas
            </li>
            <li aria-hidden="true" className="h-px w-8 bg-cream/25" />
            <li aria-current="step" className="flex items-center gap-2">
              <span aria-hidden="true" className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-amber text-[13px] text-amber-ink">2</span>
              Tus datos y pago
            </li>
            <li aria-hidden="true" className="h-px w-8 bg-cream/25" />
            <li className="flex items-center gap-2 text-muted">
              <span aria-hidden="true" className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-cream/30 text-[13px]">3</span>
              Confirmación
            </li>
          </ol>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1240px] flex-wrap items-start gap-14 px-5 pb-32 pt-14 md:px-[5%]">
        <div className="fx-up min-w-0 flex-[999_1_560px]">
          <Link href={`/cabanas/${cabin.slug}?llegada=${llegada}&salida=${salida}&huespedes=${guests}`} className="fx-link text-sm text-amber">
            ← Volver a la cabaña
          </Link>
          <h1 className="mb-10 mt-3.5 font-display text-[clamp(40px,4.4vw,60px)] font-medium leading-none">Completa tu reserva</h1>
          <CheckoutForm cabinSlug={cabin.slug} checkIn={llegada} checkOut={salida} guests={guests} total={total} />
        </div>

        <aside aria-label="Resumen de la reserva" className="fx-up fx-d2 min-w-0 flex-[1_1_360px] overflow-hidden rounded-2xl bg-surface md:sticky md:top-8">
          <div className="relative h-[220px]">
            <Image src={cabin.cover_image} alt={cabin.name} fill sizes="400px" className="object-cover" />
          </div>
          <div className="flex flex-col gap-4 p-6">
            <div>
              <p className="font-display text-[32px] font-semibold">{cabin.name}</p>
              <p className="mt-1 text-sm text-muted">{site.address}, {site.locality}</p>
            </div>
            <dl className="grid grid-cols-2 gap-3.5 border-y border-line py-4">
              {[
                ['Llegada', formatDate(llegada)],
                ['Salida', formatDate(salida)],
                ['Noches', String(nights)],
                ['Huéspedes', `${guests} ${guests === 1 ? 'persona' : 'personas'}`],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[11px] uppercase tracking-[2px] text-muted">{k}</dt>
                  <dd className="mt-1 text-[15px] font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-col gap-2.5 text-[15px] text-sub">
              <div className="flex justify-between"><span>{nights} {nights === 1 ? 'noche' : 'noches'}{subtotal === cabin.price_per_night * nights ? ` × ${formatCLP(cabin.price_per_night)}` : ''}</span><span>{formatCLP(subtotal)}</span></div>
              {q.cleaning_fee > 0 && <div className="flex justify-between"><span>Limpieza</span><span>{formatCLP(q.cleaning_fee)}</span></div>}
              <div className="flex justify-between border-t border-line pt-2.5 text-lg font-bold text-cream"><span>Total (CLP)</span><span>{formatCLP(total)}</span></div>
            </div>
          </div>
        </aside>
      </main>
    </>
  )
}
