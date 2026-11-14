import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { CabinPrice } from '@/components/cabin-price'
import { Reveal } from '@/components/reveal'
import { SearchBar } from '@/components/search-bar'
import { SiteHeader } from '@/components/site-header'
import { getCabins, isRangeFree } from '@/lib/data'
import { diffDays, formatDate, isISODate, todayInChile } from '@/lib/dates'
import { formatCLP } from '@/lib/money'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Disponibilidad' }

export default async function CabinsPage(props: PageProps<'/cabanas'>) {
  const sp = await props.searchParams
  const today = todayInChile()
  const llegada = typeof sp.llegada === 'string' && isISODate(sp.llegada) && sp.llegada >= today ? sp.llegada : null
  const salida = typeof sp.salida === 'string' && isISODate(sp.salida) && llegada && sp.salida > llegada ? sp.salida : null
  const huespedes = typeof sp.huespedes === 'string' ? Number(sp.huespedes) || 2 : 2
  const hasDates = !!(llegada && salida)
  const nights = hasDates ? diffDays(llegada!, salida!) : 0

  const cabins = await getCabins()
  const results = await Promise.all(
    cabins.map(async (c) => ({
      cabin: c,
      fits: huespedes <= c.capacity,
      free: hasDates ? await isRangeFree(c.id, llegada!, salida!) : true,
    })),
  )
  const qs = (slug: string) =>
    `/cabanas/${slug}?${new URLSearchParams({ ...(llegada ? { llegada } : {}), ...(salida ? { salida } : {}), huespedes: String(huespedes) })}`

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1440px] px-5 pb-32 pt-12 md:px-[5%]">
        <h1 className="fx-up font-display text-[clamp(44px,5vw,72px)] font-medium leading-none">
          {hasDates ? 'Disponibilidad' : 'Elige tus fechas'}
        </h1>
        <p className="fx-up fx-d1 mt-4 text-base text-sub">
          {hasDates
            ? `${formatDate(llegada!)} → ${formatDate(salida!)} · ${nights} ${nights === 1 ? 'noche' : 'noches'} · ${huespedes} ${huespedes === 1 ? 'persona' : 'personas'}`
            : 'Busca por fechas o entra a una cabaña para ver su calendario.'}
        </p>
        <SearchBar
          className="fx-up fx-d2 mt-8"
          cabins={cabins.map((c) => ({ slug: c.slug, name: c.name }))}
          today={today}
          maxGuests={Math.max(2, ...cabins.map((c) => c.capacity))}
        />

        <div className="mt-14 grid grid-cols-[repeat(auto-fit,minmax(min(100%,460px),1fr))] gap-8">
          {results.map(({ cabin: c, free, fits }, i) => {
            const ok = free && fits
            return (
              <Reveal key={c.id} delay={i * 120}>
                <Link href={qs(c.slug)} className="fx-card flex h-full flex-col overflow-hidden rounded-[10px] bg-surface">
                  <div className="relative h-[300px] overflow-hidden">
                    <Image src={c.cover_image} alt={`Exterior de la ${c.name}`} fill sizes="(max-width: 1000px) 100vw, 50vw" className="fx-zoom object-cover" />
                    {hasDates && (
                      <span
                        className={`absolute left-4 top-4 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[1.5px] ${ok ? 'bg-amber text-amber-ink' : 'bg-ink/80 text-sand'}`}
                      >
                        {ok ? 'Disponible' : !fits ? `Máx. ${c.capacity} personas` : 'No disponible'}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-3 p-7">
                    <div className="flex flex-wrap items-baseline justify-between gap-4">
                      <h2 className="font-display text-[36px] font-semibold">{c.name}</h2>
                      {hasDates && ok && c.price_per_night > 0 ? (
                        <span className="text-[15px] text-sub">
                          <strong className="text-[22px] text-cream">{formatCLP(c.price_per_night * nights + c.cleaning_fee)}</strong> total
                        </span>
                      ) : (
                        <CabinPrice price={c.price_per_night} className="text-[15px] text-sub" />
                      )}
                    </div>
                    <p className="text-[15px] text-muted">Hasta {c.capacity} huéspedes · {c.bedrooms_summary}</p>
                    <span className="fx-link mt-1 self-start font-semibold text-amber">
                      {hasDates && !ok ? 'Ver otras fechas →' : 'Ver y reservar →'}
                    </span>
                  </div>
                </Link>
              </Reveal>
            )
          })}
        </div>
      </main>
    </>
  )
}
