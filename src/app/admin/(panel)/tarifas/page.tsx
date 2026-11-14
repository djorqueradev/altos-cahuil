import type { Metadata } from 'next'
import Link from 'next/link'
import { DateField } from '@/components/date-picker'
import { getAllCabinsAdmin, getRates } from '@/lib/data'
import { addDays, formatDateShort, todayInChile } from '@/lib/dates'
import { formatCLP } from '@/lib/money'
import { createRateAction, deleteRateAction, saveCabinAction } from '../../actions'
import { Flash } from '../../_components/flash'
import { Badge, Card, Empty, PageHeader, cls } from '../../_components/ui'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Tarifas' }

const money = (n: number) => (n ? formatCLP(n).replace('$', '').trim() : '')

export default async function RatesPage(props: PageProps<'/admin/tarifas'>) {
  const sp = await props.searchParams
  const today = todayInChile()
  const [cabins, rates] = await Promise.all([getAllCabinsAdmin(), getRates({ from: addDays(today, -1) })])
  const cabinName = Object.fromEntries(cabins.map((c) => [c.id, c.name]))

  return (
    <>
      <PageHeader
        title="Tarifas"
        subtitle="Precio base de cada cabaña y temporadas con precio especial. Todo en pesos chilenos."
        actions={<Link href="/admin/calendario?vista=cabana-1" className={cls.ghost}>Ver precios por día en el calendario</Link>}
      />
      <Flash sp={sp} />

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {cabins.map((c) => (
          <Card key={c.id} title={c.name} action={!c.active && <Badge tone="gray">Oculta en la web</Badge>}>
            <form action={saveCabinAction} className="flex flex-col gap-4">
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="redirectTo" value="/admin/tarifas" />
              <div className="grid grid-cols-2 gap-3">
                <label className={cls.label}>
                  Precio por noche
                  <span className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
                    <input name="price_per_night" inputMode="numeric" defaultValue={money(c.price_per_night)} placeholder="0" className={`${cls.input} pl-7 text-base font-semibold`} />
                  </span>
                </label>
                <label className={cls.label}>
                  Limpieza (por estadía)
                  <span className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
                    <input name="cleaning_fee" inputMode="numeric" defaultValue={money(c.cleaning_fee)} placeholder="0" className={`${cls.input} pl-7`} />
                  </span>
                </label>
                <label className={cls.label}>Noches mínimas<input name="min_nights" type="number" min={1} defaultValue={c.min_nights} className={cls.input} /></label>
                <label className={cls.label}>Capacidad (personas)<input name="capacity" type="number" min={1} defaultValue={c.capacity} className={cls.input} /></label>
              </div>
              {c.price_per_night === 0 && <p className="text-[13px] text-amber-light">Sin precio base: la web muestra “Precio por confirmar” y no deja reservar online (salvo en temporadas con precio).</p>}
              <button type="submit" className={`${cls.btnSm} self-start`}>Guardar {c.name}</button>
            </form>
          </Card>
        ))}
      </div>

      <Card title="Temporadas y fechas especiales" pad={false}>
        <div className="p-5 pb-3">
          <p className="text-sm text-sub">
            Durante una temporada se cobra su precio en vez del precio base. Útil para verano, fines de semana largos, Año Nuevo, etc.
            Si una temporada es solo para una cabaña, tiene prioridad sobre las de “ambas”.
          </p>
        </div>
        {rates.length ? (
          <ul className="divide-y divide-cream/[0.05] border-y border-cream/[0.05]">
            {rates.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                <span className="min-w-[160px] flex-1">
                  <span className="block font-semibold">{r.label}</span>
                  <span className="block text-xs text-muted">
                    {formatDateShort(r.start_date)} → {formatDateShort(addDays(r.end_date, -1))} (noches incluidas) · {r.cabin_id ? cabinName[r.cabin_id] : 'Ambas cabañas'}
                  </span>
                </span>
                <span className="font-semibold tabular-nums">{formatCLP(r.price_per_night)} <span className="text-xs font-normal text-muted">/ noche</span></span>
                {r.min_nights && <Badge tone="blue">Mín. {r.min_nights} noches</Badge>}
                <form action={deleteRateAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" className={cls.ghostSm}>Eliminar</button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-y border-cream/[0.05]"><Empty>Aún no hay temporadas. Mientras tanto se usa el precio base.</Empty></div>
        )}

        <form action={createRateAction} className="flex flex-col gap-4 p-5">
          <h3 className="text-sm font-semibold">Agregar temporada</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className={cls.label}>
              Nombre
              <input name="label" list="rate-labels" placeholder="Ej: Verano" className={cls.input} />
              <datalist id="rate-labels">
                <option value="Verano" />
                <option value="Fin de semana largo" />
                <option value="Fiestas Patrias" />
                <option value="Año Nuevo" />
                <option value="Vacaciones de invierno" />
                <option value="Temporada baja" />
              </datalist>
            </label>
            <label className={cls.label}>
              Aplica a
              <select name="cabin_id" className={cls.input} defaultValue="">
                <option value="">Ambas cabañas</option>
                {cabins.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className={cls.label}>
              Precio por noche
              <span className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
                <input name="price_per_night" inputMode="numeric" required placeholder="0" className={`${cls.input} pl-7`} />
              </span>
            </label>
            <div className={cls.label}><span aria-hidden="true">Desde (primera noche)</span><DateField aria-label="Desde" name="start_date" className={`${cls.input} flex items-center`} /></div>
            <div className={cls.label}><span aria-hidden="true">Hasta (última noche)</span><DateField aria-label="Hasta" name="end_date" className={`${cls.input} flex items-center`} /></div>
            <label className={cls.label}>Noches mínimas (opcional)<input name="min_nights" type="number" min={1} placeholder="—" className={cls.input} /></label>
          </div>
          <button type="submit" className={`${cls.btnSm} self-start`}>Agregar temporada</button>
        </form>
      </Card>
    </>
  )
}
