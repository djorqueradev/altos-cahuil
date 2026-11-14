import { getAllCabinsAdmin } from '@/lib/data'
import { updateCabin } from '../../actions'
import { Flash, btn, card, inputCls, labelCls } from '../flash'

export const dynamic = 'force-dynamic'

export default async function CabinsAdminPage(props: PageProps<'/admin/cabanas'>) {
  const sp = await props.searchParams
  const cabins = await getAllCabinsAdmin()

  return (
    <div className="fx-up flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[40px] font-medium leading-none">Cabañas y tarifas</h1>
        <p className="mt-2 text-sm text-sub">Los precios están en pesos chilenos. Una cabaña con precio 0 no se puede reservar online.</p>
      </div>
      <Flash sp={sp} />
      {cabins.map((c) => (
        <form key={c.id} action={updateCabin} className={`${card} flex flex-col gap-5 p-6`}>
          <input type="hidden" name="id" value={c.id} />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-display text-[30px] font-semibold">{c.name}</h2>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" defaultChecked={c.active} className="h-5 w-5 accent-amber" /> Visible en el sitio
            </label>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-4">
            <label className={labelCls}>Nombre<input name="name" defaultValue={c.name} required className={inputCls} /></label>
            <label className={labelCls}>Precio por noche (CLP)<input name="price_per_night" inputMode="numeric" defaultValue={c.price_per_night} className={inputCls} /></label>
            <label className={labelCls}>Limpieza (CLP)<input name="cleaning_fee" inputMode="numeric" defaultValue={c.cleaning_fee} className={inputCls} /></label>
            <label className={labelCls}>Capacidad (personas)<input name="capacity" type="number" min={1} defaultValue={c.capacity} className={inputCls} /></label>
            <label className={labelCls}>Noches mínimas<input name="min_nights" type="number" min={1} defaultValue={c.min_nights} className={inputCls} /></label>
          </div>
          <label className={labelCls}>Distribución (texto corto)<input name="bedrooms_summary" defaultValue={c.bedrooms_summary} className={inputCls} /></label>
          <label className={labelCls}>Descripción corta<input name="short_description" defaultValue={c.short_description} className={inputCls} /></label>
          <label className={labelCls}>Descripción<textarea name="description" rows={4} defaultValue={c.description} className={`${inputCls} py-3`} /></label>
          <label className={labelCls}>Qué ofrece (uno por línea)<textarea name="amenities" rows={6} defaultValue={c.amenities.join('\n')} className={`${inputCls} py-3`} /></label>
          <div><button type="submit" className={btn}>Guardar {c.name}</button></div>
        </form>
      ))}
    </div>
  )
}
