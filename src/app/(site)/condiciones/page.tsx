import type { Metadata } from 'next'
import { SiteHeader } from '@/components/site-header'
import { site } from '@/lib/site'

export const metadata: Metadata = { title: 'Condiciones de reserva' }

export default function ConditionsPage() {
  const items: [string, string][] = [
    ['Pago', 'La reserva se confirma al pagar el total con Mercado Pago. Las fechas quedan reservadas por 30 minutos mientras completas el pago.'],
    ['Horarios', `Check-in desde las ${site.checkInFrom}. Check-out hasta las ${site.checkOutUntil}.`],
    ['Cancelación', site.cancellationPolicy],
    ['Mascotas', site.petsPolicy],
    ['Capacidad', 'Cada cabaña tiene una capacidad máxima indicada en su ficha. No se permiten visitas que la excedan.'],
    ['Contacto', `${site.phone} · ${site.email}`],
  ]
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[860px] px-5 pb-32 pt-14">
        <h1 className="fx-up font-display text-[clamp(44px,5vw,68px)] font-medium leading-none">Condiciones de reserva</h1>
        <p className="fx-up fx-d1 mt-4 text-sub">[Revisa y completa este texto con tus condiciones reales.]</p>
        <dl className="fx-up fx-d2 mt-12 flex flex-col">
          {items.map(([k, v]) => (
            <div key={k} className="grid gap-2 border-b border-line py-6 md:grid-cols-[200px_1fr]">
              <dt className="text-xs font-semibold uppercase tracking-[2px] text-muted">{k}</dt>
              <dd className="text-[17px] leading-relaxed">{v}</dd>
            </div>
          ))}
        </dl>
      </main>
    </>
  )
}
