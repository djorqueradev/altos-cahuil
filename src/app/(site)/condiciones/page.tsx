import type { Metadata } from 'next'
import { SiteHeader } from '@/components/site-header'
import { getSettings, orConsult } from '@/lib/settings'

export const metadata: Metadata = { title: 'Condiciones de reserva' }

export default async function ConditionsPage() {
  const s = await getSettings()
  const items: [string, string][] = [
    ['Pago', `La reserva se confirma al pagar el total con Mercado Pago. Las fechas quedan reservadas por ${s.payment_hold_minutes} minutos mientras completas el pago.`],
    ['Horarios', `Check-in desde las ${orConsult(s.check_in_from)}. Check-out hasta las ${orConsult(s.check_out_until)}.`],
    ['Cancelación', orConsult(s.cancellation_policy)],
    ['Mascotas', orConsult(s.pets_policy)],
    ...(s.house_rules.trim() ? [['Normas de la casa', s.house_rules] as [string, string]] : []),
    ['Capacidad', 'Cada cabaña tiene una capacidad máxima indicada en su ficha. No se permiten visitas que la excedan.'],
    ['Contacto', `${s.contact_phone} · ${s.contact_email}`],
  ]
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[860px] px-5 pb-32 pt-14">
        <h1 className="fx-up font-display text-[clamp(44px,5vw,68px)] font-medium leading-none">Condiciones de reserva</h1>
        <dl className="fx-up fx-d2 mt-12 flex flex-col">
          {items.map(([k, v]) => (
            <div key={k} className="grid gap-2 border-b border-line py-6 md:grid-cols-[200px_1fr]">
              <dt className="text-xs font-semibold uppercase tracking-[2px] text-muted">{k}</dt>
              <dd className="whitespace-pre-line text-[17px] leading-relaxed">{v}</dd>
            </div>
          ))}
        </dl>
      </main>
    </>
  )
}
