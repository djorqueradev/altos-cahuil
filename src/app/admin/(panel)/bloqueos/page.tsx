import { getAllCabinsAdmin } from '@/lib/data'
import { addDays, formatDateShort, todayInChile } from '@/lib/dates'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createBlock, deleteBlock } from '../../actions'
import { ConfirmSubmit } from '../confirm-submit'
import { Flash, btn, card, ghost, inputCls, labelCls } from '../flash'

export const dynamic = 'force-dynamic'

export default async function BlocksPage(props: PageProps<'/admin/bloqueos'>) {
  const sp = await props.searchParams
  const today = todayInChile()
  const cabins = await getAllCabinsAdmin()
  const cabinName = Object.fromEntries(cabins.map((c) => [c.id, c.name]))
  const { data } = await supabaseAdmin()
    .from('blocks')
    .select('id, cabin_id, start_date, end_date, reason')
    .gte('end_date', addDays(today, -1))
    .order('start_date')

  return (
    <div className="fx-up flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[40px] font-medium leading-none">Bloqueos</h1>
        <p className="mt-2 text-sm text-sub">Cierra fechas por mantención o uso propio. También se bloquean en Booking y Airbnb.</p>
      </div>
      <Flash sp={sp} />

      <section className={`${card} p-6`}>
        <h2 className="text-lg font-bold">Bloquear fechas</h2>
        <form action={createBlock} className="mt-5 flex flex-col gap-4">
          <fieldset className="flex flex-wrap gap-4 border-0 p-0">
            <legend className="mb-2 text-[13px] font-semibold text-sub">Cabañas</legend>
            {cabins.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-[15px]">
                <input type="checkbox" name="cabin_id" value={c.id} defaultChecked className="h-5 w-5 accent-amber" /> {c.name}
              </label>
            ))}
          </fieldset>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-4">
            <label className={labelCls}>Desde (primera noche)<input type="date" name="start_date" required min={today} className={inputCls} /></label>
            <label className={labelCls}>Hasta (día de salida)<input type="date" name="end_date" required min={today} className={inputCls} /></label>
            <label className={labelCls}>Motivo<input name="reason" placeholder="Mantención" className={inputCls} /></label>
            <div className="flex items-end"><button type="submit" className={btn}>Bloquear</button></div>
          </div>
        </form>
      </section>

      <section className={`${card} overflow-x-auto`}>
        <table className="w-full min-w-[600px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[1.5px] text-muted">
              {['Cabaña', 'Fechas', 'Motivo', ''].map((h) => <th key={h} className="px-5 py-3.5 font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {(data ?? []).length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-muted">No hay bloqueos vigentes.</td></tr>}
            {(data ?? []).map((k) => (
              <tr key={k.id} className="fx-row border-t border-line">
                <td className="px-5 py-4 font-semibold">{cabinName[k.cabin_id]}</td>
                <td className="px-5 py-4">{formatDateShort(k.start_date)} → {formatDateShort(k.end_date)}</td>
                <td className="px-5 py-4 text-sub">{k.reason}</td>
                <td className="px-5 py-4 text-right">
                  <form action={deleteBlock}>
                    <input type="hidden" name="id" value={k.id} />
                    <ConfirmSubmit message="¿Eliminar este bloqueo?" className={ghost}>Eliminar</ConfirmSubmit>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
