import type { Metadata } from 'next'
import { getAllCabinsAdmin } from '@/lib/data'
import { env } from '@/lib/env'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { saveFeedAction } from '../../actions'
import { CopyField } from '../../_components/copy-field'
import { Flash } from '../../_components/flash'
import { Badge, Card, PageHeader, cls } from '../../_components/ui'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Booking y Airbnb' }

const CHANNELS = [
  {
    id: 'booking',
    name: 'Booking.com',
    how: 'Extranet → Tarifas y disponibilidad → Sincronizar calendarios.',
  },
  {
    id: 'airbnb',
    name: 'Airbnb',
    how: 'Anuncio → Disponibilidad → Sincronización de calendarios / Conectar calendarios.',
  },
] as const

export default async function ChannelsPage(props: PageProps<'/admin/canales'>) {
  const sp = await props.searchParams
  const cabins = await getAllCabinsAdmin()
  const { data: feeds } = await supabaseAdmin().from('channel_feeds').select('*')
  const site = env.siteUrl()

  return (
    <>
      <PageHeader
        title="Booking y Airbnb"
        subtitle="Conecta los calendarios en las dos direcciones para que una reserva en cualquier lado bloquee las fechas en los demás."
      />
      <Flash sp={sp} />

      <div className="mb-5 rounded-2xl border border-cream/[0.06] bg-surface p-5 text-sm leading-relaxed text-sub">
        <p className="mb-2 font-semibold text-cream">Cómo se conecta (una vez por cabaña y por canal):</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>En Booking/Airbnb, <strong className="text-cream">exporta</strong> el calendario y pega ese enlace en el paso 1.</li>
          <li>Copia nuestro enlace del paso 2 y pégalo en la opción <strong className="text-cream">importar calendario</strong> de Booking/Airbnb.</li>
        </ol>
        <p className="mt-2 text-xs text-muted">Booking y Airbnb leen nuestro calendario cada cierto tiempo (normalmente entre 30 minutos y unas horas). Nosotros leemos los suyos antes de cada reserva web y periódicamente.</p>
      </div>

      <div className="flex flex-col gap-4">
        {cabins.map((c) => (
          <Card key={c.id} title={c.name}>
            <div className="grid gap-4 lg:grid-cols-2">
              {CHANNELS.map((ch) => {
                const feed = (feeds ?? []).find((f) => f.cabin_id === c.id && f.channel === ch.id)
                const exportUrl = `${site}/api/ical/${c.slug}?token=${c.ical_export_token}&exclude=${ch.id}`
                const ok = feed?.last_status === 'ok'
                return (
                  <div key={ch.id} className="flex flex-col gap-4 rounded-xl bg-ink p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">{ch.name}</p>
                      {feed ? (
                        ok ? <Badge tone="green">Conectado · {feed.last_event_count ?? 0} reservas</Badge> : <Badge tone="red">Error al leer</Badge>
                      ) : (
                        <Badge tone="gray">Sin conectar</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted">{ch.how}</p>
                    {feed && !ok && feed.last_status && <p className="text-xs text-[#F4B4AC]">{feed.last_status}</p>}
                    <form action={saveFeedAction} className="flex flex-col gap-2">
                      <input type="hidden" name="cabin_id" value={c.id} />
                      <input type="hidden" name="channel" value={ch.id} />
                      <label className={cls.label}>
                        1 · Enlace que exporta {ch.name}
                        <input name="ical_url" type="url" defaultValue={feed?.ical_url ?? ''} placeholder="https://…" className={cls.input} />
                      </label>
                      <button type="submit" className={`${cls.btnSm} self-start`}>{feed ? 'Guardar y sincronizar' : 'Conectar'}</button>
                    </form>
                    <CopyField label={`2 · Pega este enlace en ${ch.name} (importar calendario)`} value={exportUrl} />
                    {feed?.last_synced_at && (
                      <p className="text-xs text-muted">
                        Última lectura: {new Date(feed.last_synced_at).toLocaleString('es-CL', { timeZone: 'America/Santiago', dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}
