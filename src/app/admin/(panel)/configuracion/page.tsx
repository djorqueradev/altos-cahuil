import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllCabinsAdmin } from '@/lib/data'
import { getSettings } from '@/lib/settings'
import { saveCabinAction, saveSettingsAction } from '../../actions'
import { Flash } from '../../_components/flash'
import { Card, PageHeader, cls } from '../../_components/ui'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Configuración' }

export default async function SettingsPage(props: PageProps<'/admin/configuracion'>) {
  const sp = await props.searchParams
  const [s, cabins] = await Promise.all([getSettings(), getAllCabinsAdmin()])

  return (
    <>
      <PageHeader title="Configuración" subtitle="Lo que ven los huéspedes en la web y en los correos de confirmación." />
      <Flash sp={sp} />

      <Link href="/admin/configuracion/correos" className={`fx-tile ${cls.card} mb-6 flex items-center justify-between gap-4 p-5`}>
        <span>
          <span className="block text-[15px] font-semibold">Correos automáticos</span>
          <span className="mt-1 block text-sm text-muted">Confirmación, recordatorio, agradecimiento y avisos para ustedes. Ver cómo se ven y elegir cuáles enviar.</span>
        </span>
        <span aria-hidden="true" className="text-xl text-amber">→</span>
      </Link>

      <form action={saveSettingsAction} className="mb-6 flex flex-col gap-4">
        <Card title="Estadía y políticas">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid grid-cols-2 gap-3">
              <label className={cls.label}>Check-in desde<input name="check_in_from" defaultValue={s.check_in_from} placeholder="14:00" className={cls.input} /></label>
              <label className={cls.label}>Check-in hasta<input name="check_in_until" defaultValue={s.check_in_until} placeholder="20:00" className={cls.input} /></label>
            </div>
            <label className={cls.label}>Check-out hasta<input name="check_out_until" defaultValue={s.check_out_until} placeholder="12:00" className={cls.input} /></label>
            <label className={`${cls.label} md:col-span-2`}>
              Política de cancelación
              <textarea name="cancellation_policy" rows={3} defaultValue={s.cancellation_policy} placeholder="Ej: Cancelación gratis hasta 7 días antes de la llegada. Después no hay reembolso." className={cls.textarea} />
            </label>
            <label className={cls.label}>
              Mascotas
              <input name="pets_policy" defaultValue={s.pets_policy} placeholder="Ej: Se aceptan mascotas pequeñas" className={cls.input} />
            </label>
            <label className={cls.label}>
              Minutos para pagar en la web
              <input name="payment_hold_minutes" type="number" min={10} max={120} defaultValue={s.payment_hold_minutes} className={cls.input} />
              <span className="text-xs font-normal text-muted">Tiempo que se apartan las fechas mientras el huésped paga.</span>
            </label>
            <label className={`${cls.label} md:col-span-2`}>
              Normas de la casa (opcional)
              <textarea name="house_rules" rows={3} defaultValue={s.house_rules} placeholder="Ej: No se permiten fiestas. Silencio desde las 23:00." className={cls.textarea} />
            </label>
          </div>
        </Card>
        <Card title="Contacto">
          <div className="grid gap-4 md:grid-cols-2">
            <label className={cls.label}>Teléfono<input name="contact_phone" defaultValue={s.contact_phone} className={cls.input} /></label>
            <label className={cls.label}>WhatsApp (solo números con código país)<input name="whatsapp" defaultValue={s.whatsapp} placeholder="56981975916" className={cls.input} /></label>
            <label className={cls.label}>Correo<input name="contact_email" type="email" defaultValue={s.contact_email} className={cls.input} /></label>
            <label className={cls.label}>Instagram (opcional)<input name="instagram" defaultValue={s.instagram} placeholder="@altosdecahuil" className={cls.input} /></label>
          </div>
        </Card>
        <div><button type="submit" className={cls.btn}>Guardar configuración</button></div>
      </form>

      <h2 className="mb-3 text-[15px] font-semibold">Contenido de cada cabaña en la web</h2>
      <p className="mb-4 text-sm text-muted">Precios, limpieza y noches mínimas se cambian en <Link href="/admin/tarifas" className="text-amber underline underline-offset-2">Tarifas</Link>.</p>
      <div className="grid gap-4 lg:grid-cols-2">
        {cabins.map((c) => (
          <Card key={c.id} title={c.name}>
            <form action={saveCabinAction} className="flex flex-col gap-4">
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="redirectTo" value="/admin/configuracion" />
              <input type="hidden" name="active_present" value="1" />
              <label className="flex items-center gap-3 text-sm">
                <input type="checkbox" name="active" defaultChecked={c.active} className="h-5 w-5 accent-amber" /> Visible y reservable en la web
              </label>
              <label className={cls.label}>Nombre<input name="name" defaultValue={c.name} required className={cls.input} /></label>
              <label className={cls.label}>Distribución (texto corto)<input name="bedrooms_summary" defaultValue={c.bedrooms_summary} className={cls.input} /></label>
              <label className={cls.label}>Descripción corta<input name="short_description" defaultValue={c.short_description} className={cls.input} /></label>
              <label className={cls.label}>Descripción<textarea name="description" rows={5} defaultValue={c.description} className={cls.textarea} /></label>
              <label className={cls.label}>Qué ofrece (uno por línea)<textarea name="amenities" rows={6} defaultValue={c.amenities.join('\n')} className={cls.textarea} /></label>
              <button type="submit" className={`${cls.btnSm} self-start`}>Guardar {c.name}</button>
            </form>
          </Card>
        ))}
      </div>
    </>
  )
}
