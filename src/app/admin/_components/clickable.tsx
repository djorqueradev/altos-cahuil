'use client'

import type { ReactNode } from 'react'
import { useAdmin } from './admin-provider'
import type { AdminBooking, CalItem } from './model'

/** Fila/elemento que abre el detalle de una reserva o de un bloqueo/evento externo. */
export function OpenDetail({
  booking,
  item,
  cabinName,
  className = '',
  children,
}: {
  booking?: AdminBooking
  item?: CalItem
  cabinName?: string
  className?: string
  children: ReactNode
}) {
  const { openBooking, openItem } = useAdmin()
  return (
    <button
      type="button"
      onClick={() => (booking ? openBooking(booking) : item && openItem(item, cabinName ?? ''))}
      className={`w-full text-left transition-colors hover:bg-cream/[0.035] ${className}`}
    >
      {children}
    </button>
  )
}

export function QuickActions() {
  const { openNewBooking, openBlock } = useAdmin()
  return (
    <>
      <button type="button" onClick={() => openBlock()} className="fx-ghost hidden h-10 items-center gap-2 rounded-full border border-cream/20 px-4 text-[13px] font-semibold md:inline-flex">
        Bloquear fechas
      </button>
      <button type="button" onClick={() => openNewBooking()} className="fx-btn hidden h-10 items-center gap-2 rounded-full bg-amber px-4 text-[13px] font-bold text-amber-ink md:inline-flex">
        + Nueva reserva
      </button>
    </>
  )
}
