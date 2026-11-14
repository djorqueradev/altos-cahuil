import type { Metadata } from 'next'
import Link from 'next/link'
import { todayInChile } from '@/lib/dates'
import { ownerRecipients } from '@/lib/email'
import { sampleBooking } from '@/lib/emails/sample'
import { TEMPLATES, renderTemplate, type TemplateId } from '@/lib/emails/templates'
import { env } from '@/lib/env'
import { getSettings } from '@/lib/settings'
import { saveEmailSettingsAction, sendTestEmailAction } from '../../../actions'
import { Flash } from '../../../_components/flash'
import { Badge, Card, PageHeader, cls } from '../../../_components/ui'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Correos automáticos' }

export default async function EmailsPage(props: PageProps<'/admin/configuracion/correos'>) {
  const sp = await props.searchParams
  const ver = (typeof sp.ver === 'string' && TEMPLATES.some((t) => t.id === sp.ver) ? sp.ver : 'guest-confirmed') as TemplateId
  const movil = sp.ancho === 'movil'
  const [s, sample] = await Promise.all([getSettings(), sampleBooking()])
  const current = TEMPLATES.find((t) => t.id === ver)!
  const email = renderTemplate(ver, { siteUrl: env.siteUrl(), settings: s, booking: sample.booking, cabin: sample.cabin }, todayInChile())
  const hasKey = !!env.resendApiKey()
  const owners = ownerRecipients(s)
  const href = (id: string, ancho = movil) => `/admin/configuracion/correos?${new URLSearchParams({ ver: id, ...(ancho ? { ancho: 'movil' } : {}) })}`

  const enabled: Record<TemplateId, boolean> = {
    'guest-confirmed': true,
    'guest-reminder': s.email_reminders,
    'guest-thanks': s.email_thanks,
    'guest-abandoned': s.email_abandoned,
    'guest-cancelled': true,
    'owner-new': true,
    'owner-abandoned': true,
    'owner-alert': true,
  }

  return (
    <>
      <PageHeader
        title="Correos automáticos"
        subtitle="Lo que reciben los huéspedes y ustedes en cada momento de la reserva."
        actions={<Link href="/admin/configuracion" className={cls.ghost}>← Configuración</Link>}
      />
      <Flash sp={sp} />

      {!hasKey && (
        <div className="mb-6 rounded-2xl border border-amber/30 bg-amber/10 p-5 text-sm text-cream">
          <p className="mb-2 font-semibold text-amber-light">Los correos todavía no se están enviando</p>
          <p className="text-sub">
            Falta conectar Resend: agrega <code className="rounded bg-ink px-1.5 py-0.5">RESEND_API_KEY</code> y{' '}
            <code className="rounded bg-ink px-1.5 py-0.5">EMAIL_FROM</code> en Vercel y vuelve a desplegar. Mientras tanto puedes revisar aquí cómo se ven.
          </p>
        </div>
      )}

      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Card title="Estado">
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Resend</dt>
              <dd>{hasKey ? <Badge tone="green">Conectado</Badge> : <Badge tone="red">Sin configurar</Badge>}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Se envían desde</dt>
              <dd className="truncate text-right font-medium">{env.emailFrom()}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Respuestas llegan a</dt>
              <dd className="truncate text-right font-medium">{s.contact_email}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-muted">Avisos internos a</dt>
              <dd className="text-right font-medium">{owners.join(', ') || '—'}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Qué se envía">
          <form action={saveEmailSettingsAction} className="flex flex-col gap-4 text-sm">
            <p className="text-muted">La confirmación, la cancelación y los avisos para ustedes se envían siempre.</p>
            <label className="flex items-start gap-3">
              <input type="checkbox" name="email_reminders" defaultChecked={s.email_reminders} className="mt-0.5 h-5 w-5 shrink-0 accent-amber" />
              <span>
                <span className="font-medium text-cream">Recordatorio de llegada</span>
                <span className="mt-1 flex items-center gap-2 text-muted">
                  Enviar
                  <select name="reminder_days" defaultValue={String(s.reminder_days)} className="fx-field h-8 rounded-lg border border-cream/15 bg-ink px-2 text-cream">
                    {[1, 2, 3, 4, 5, 7].map((d) => (
                      <option key={d} value={d}>{d === 1 ? '1 día' : `${d} días`}</option>
                    ))}
                  </select>
                  antes del check-in
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" name="email_thanks" defaultChecked={s.email_thanks} className="mt-0.5 h-5 w-5 shrink-0 accent-amber" />
              <span><span className="font-medium text-cream">Gracias por tu visita</span><br /><span className="text-muted">El día después del check-out.</span></span>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" name="email_abandoned" defaultChecked={s.email_abandoned} className="mt-0.5 h-5 w-5 shrink-0 accent-amber" />
              <span><span className="font-medium text-cream">Pago no completado</span><br /><span className="text-muted">Invita a reintentar si no alcanzó a pagar.</span></span>
            </label>
            <label className={cls.label}>
              Avisos de nuevas reservas a (separa con coma)
              <input name="notify_emails" defaultValue={s.notify_emails} placeholder={owners.join(', ') || 'correo@ejemplo.com'} className={cls.input} />
              <span className="text-xs font-normal text-muted">Si lo dejas vacío se usa el correo de contacto.</span>
            </label>
            <div><button type="submit" className={cls.btnSm}>Guardar</button></div>
          </form>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <nav aria-label="Plantillas" className="flex flex-col gap-2">
          {(['huésped', 'ustedes'] as const).map((to) => (
            <div key={to} className="flex flex-col gap-2">
              <p className="mt-2 text-xs font-semibold uppercase tracking-[1.5px] text-muted">{to === 'huésped' ? 'Para el huésped' : 'Para ustedes'}</p>
              {TEMPLATES.filter((t) => t.to === to).map((t) => (
                <Link
                  key={t.id}
                  href={href(t.id)}
                  aria-current={t.id === ver ? 'page' : undefined}
                  className={`fx-tile rounded-xl border px-4 py-3 text-sm ${t.id === ver ? 'border-amber/50 bg-amber/10' : 'border-cream/[0.06] bg-surface'}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-cream">{t.name}</span>
                    {!enabled[t.id] && <Badge>Apagado</Badge>}
                  </span>
                  <span className="mt-1 block text-[13px] leading-snug text-muted">{t.when}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <Card
          pad={false}
          title={current.name}
          action={
            <div className="flex items-center gap-2">
              <div className="flex rounded-full bg-ink p-0.5 text-xs font-semibold">
                <Link href={href(ver, false)} className={`rounded-full px-3 py-1.5 ${!movil ? 'bg-surface-2 text-cream' : 'text-muted'}`}>Escritorio</Link>
                <Link href={href(ver, true)} className={`rounded-full px-3 py-1.5 ${movil ? 'bg-surface-2 text-cream' : 'text-muted'}`}>Celular</Link>
              </div>
              <form action={sendTestEmailAction}>
                <input type="hidden" name="template" value={ver} />
                <button type="submit" className={cls.btnSm} disabled={!hasKey} title={hasKey ? 'Te llega a tu correo de administrador' : 'Primero conecta Resend'}>
                  Enviarme una prueba
                </button>
              </form>
            </div>
          }
        >
          <div className="border-b border-cream/[0.06] px-5 py-3 text-sm">
            <p><span className="text-muted">Asunto: </span><span className="font-semibold">{email.subject}</span></p>
            <p className="mt-1 text-[13px] text-muted">Vista previa en la bandeja: {email.preheader}</p>
          </div>
          <div className="flex justify-center bg-[#EFE7DC] p-3 md:p-5">
            <iframe
              title={`Vista previa: ${current.name}`}
              srcDoc={email.html}
              sandbox=""
              className="h-[900px] rounded-lg bg-white shadow-lg transition-[width] duration-300"
              style={{ width: movil ? 390 : '100%', maxWidth: 680 }}
            />
          </div>
          <p className="px-5 py-3 text-xs text-muted">Ejemplo con datos de prueba. Los textos de horarios, políticas y contacto salen de Configuración.</p>
        </Card>
      </div>
    </>
  )
}
