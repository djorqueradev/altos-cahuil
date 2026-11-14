'use client'

import { useState } from 'react'
import { addDays, diffDays, formatDate } from '@/lib/dates'
import { deleteBlockAction } from '../actions'
import { useAdmin } from './admin-provider'
import { Drawer } from './drawer'
import { KIND_LABEL, type CalItem } from './model'
import { cls } from './ui'

const CHANNEL_LINK: Record<string, string> = {
  booking: 'https://admin.booking.com',
  airbnb: 'https://www.airbnb.cl/hosting/reservations',
}

/** Detalle de un bloqueo o de una reserva importada de Booking/Airbnb. */
export function ItemDetail({ item, cabinName, onClose }: { item: CalItem; cabinName: string; onClose: () => void }) {
  const { run } = useAdmin()
  const [busy, setBusy] = useState(false)
  const nights = diffDays(item.start, item.end)
  const isBlock = item.kind === 'block'

  return (
    <Drawer open onClose={onClose} title={isBlock ? 'Fechas bloqueadas' : `Reserva de ${KIND_LABEL[item.kind]}`} subtitle={cabinName} width={460}>
      <div className="flex flex-col gap-5">
        <section className="grid grid-cols-2 gap-3 rounded-2xl bg-ink p-4 text-sm">
          <div><p className="text-xs text-muted">{isBlock ? 'Primera noche' : 'Llegada'}</p><p className="mt-0.5 font-semibold">{formatDate(item.start)}</p></div>
          <div><p className="text-xs text-muted">{isBlock ? 'Última noche' : 'Salida'}</p><p className="mt-0.5 font-semibold">{formatDate(isBlock ? addDays(item.end, -1) : item.end)}</p></div>
          <div><p className="text-xs text-muted">Noches</p><p className="mt-0.5 font-semibold">{nights}</p></div>
          {isBlock && <div><p className="text-xs text-muted">Motivo</p><p className="mt-0.5 font-semibold">{item.reason}</p></div>}
        </section>
        {isBlock ? (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              if (!item.blockId || !window.confirm('¿Eliminar este bloqueo? Las fechas quedarán disponibles para reservar.')) return
              setBusy(true)
              const r = await run(() => deleteBlockAction(item.blockId!))
              setBusy(false)
              if (r.ok) onClose()
            }}
            className={`${cls.danger} self-start`}
          >
            Quitar bloqueo
          </button>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-sub">
              Esta reserva viene del calendario de {KIND_LABEL[item.kind]}. Los datos del huésped y el pago se ven allá; aquí solo bloquea las fechas para que nadie más reserve.
            </p>
            <a href={CHANNEL_LINK[item.kind]} target="_blank" rel="noreferrer" className={`${cls.btnSm} self-start`}>Abrir {KIND_LABEL[item.kind]} ↗</a>
          </>
        )}
      </div>
    </Drawer>
  )
}
