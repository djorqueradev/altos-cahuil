import { getAllCabinsAdmin } from '@/lib/data'
import { env } from '@/lib/env'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { saveFeed, syncNow } from '../../actions'
import { Flash, btn, card, ghost, inputCls, labelCls } from '../flash'

export const dynamic = 'force-dynamic'

const CHANNELS = [
  {
    id: 'booking',
    name: 'Booking.com',
    how: 'Extranet → Tarifas y disponibilidad → Sincronizar calendarios → Exportar calendario (copia el enlace) / Importar calendario (pega el nuestro).',
  },
  {
    id: 'airbnb',
    name: 'Airbnb',
    how: 'Anuncio → Disponibilidad → Conectar calendarios → Exportar calendario (copia el enlace) / Importar calendario (pega el nuestro).',
  },
] as const

export default async function ChannelsPage(props: PageProps<'/admin/canales'>) {
  const sp = await props.searchParams
  const cabins = await getAllCabinsAdmin()
  const { data: feeds } = await supabaseAdmin().from('channel_feeds').select('*')
  const site = env.siteUrl()

  return (
    <div className="fx-up flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[40px] font-medium leading-none">Booking y Airbnb</h1>
          <p className="mt-2 max-w-[720px] text-sm text-sub">
            Conecta los calendarios en las dos direcciones: pega aquí el enlace que te da cada canal, y pega en cada canal el enlace
            nuestro. Así una reserva en cualquier lado bloquea las fechas en los demás.
          </p>
        </div>
        <form action={syncNow}>
          <input type="hidden" name="redirectTo" value="/admin/canales" />
          <button type="submit" className={ghost}>Sincronizar ahora</button>
        </form>
      </div>
      <Flash sp={sp} />

      {cabins.map((c) => (
        <section key={c.id} className={`${card} flex flex-col gap-6 p-6`}>
          <h2 className="font-display text-[30px] font-semibold">{c.name}</h2>
          {CHANNELS.map((ch) => {
            const feed = (feeds ?? []).find((f) => f.cabin_id === c.id && f.channel === ch.id)
            const exportUrl = `${site}/api/ical/${c.slug}?token=${c.ical_export_token}&exclude=${ch.id}`
            const ok = feed?.last_status === 'ok'
            return (
              <div key={ch.id} className="flex flex-col gap-4 rounded-xl bg-ink p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold">{ch.name}</p>
                  {feed ? (
                    <span className={`flex items-center gap-2 text-[13px] font-semibold ${ok ? 'text-[#A7E3BC]' : 'text-amber-light'}`}>
                      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${ok ? 'bg-[#4ADE80]' : 'bg-amber'}`} />
                      {ok ? `Conectado · ${feed.last_event_count ?? 0} reservas` : feed.last_status ?? 'Sin sincronizar'}
                    </span>
                  ) : (
                    <span className="text-[13px] text-muted">Sin conectar</span>
                  )}
                </div>
                <p className="text-xs leading-relaxed text-muted">{ch.how}</p>
                <form action={saveFeed} className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="cabin_id" value={c.id} />
                  <input type="hidden" name="channel" value={ch.id} />
                  <label className={`${labelCls} min-w-0 flex-[1_1_380px]`}>
                    1 · Enlace iCal que exporta {ch.name}
                    <input name="ical_url" type="url" defaultValue={feed?.ical_url ?? ''} placeholder="https://…" className={inputCls} />
                  </label>
                  <button type="submit" className={btn}>Guardar</button>
                </form>
                <label className={labelCls}>
                  2 · Pega este enlace en “Importar calendario” de {ch.name}
                  <input readOnly value={exportUrl} className={`${inputCls} font-mono text-xs`} />
                </label>
              </div>
            )
          })}
        </section>
      ))}
    </div>
  )
}
