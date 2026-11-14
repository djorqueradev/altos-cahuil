'use client'

import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { BlockForm, type BlockPrefill } from './block-form'
import { BookingDetail } from './booking-detail'
import { Drawer } from './drawer'
import { ItemDetail } from './item-detail'
import type { AdminBooking, CabinLite, CalItem } from './model'
import { NewBookingForm, type NewBookingPrefill } from './new-booking-form'

type Toast = { id: number; text: string; tone: 'ok' | 'error' }

type Ctx = {
  cabins: CabinLite[]
  toast: (text: string, tone?: 'ok' | 'error') => void
  /** Ejecuta una acción del servidor, muestra el resultado y refresca los datos. */
  run: <T extends { ok: boolean; message?: string; error?: string }>(fn: () => Promise<T>) => Promise<T>
  openNewBooking: (prefill?: NewBookingPrefill) => void
  openBlock: (prefill?: BlockPrefill) => void
  openBooking: (b: AdminBooking) => void
  openItem: (item: CalItem, cabinName: string) => void
}

const AdminCtx = createContext<Ctx | null>(null)

export function useAdmin() {
  const c = useContext(AdminCtx)
  if (!c) throw new Error('useAdmin fuera de AdminProvider')
  return c
}

type Panel =
  | { type: 'new'; prefill?: NewBookingPrefill }
  | { type: 'block'; prefill?: BlockPrefill }
  | { type: 'booking'; booking: AdminBooking }
  | { type: 'item'; item: CalItem; cabinName: string }
  | null

export function AdminProvider({ cabins, children }: { cabins: CabinLite[]; children: ReactNode }) {
  const router = useRouter()
  const [toasts, setToasts] = useState<Toast[]>([])
  const [panel, setPanel] = useState<Panel>(null)
  const seq = useRef(0)
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  const toast = useCallback((text: string, tone: 'ok' | 'error' = 'ok') => {
    const id = ++seq.current
    setToasts((t) => [...t, { id, text, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 7000 : 4000)
  }, [])

  const run = useCallback(
    async <T extends { ok: boolean; message?: string; error?: string }>(fn: () => Promise<T>) => {
      try {
        const r = await fn()
        if (r.ok) {
          if (r.message) toast(r.message)
          router.refresh()
        } else toast(r.error || 'Ocurrió un error', 'error')
        return r
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Ocurrió un error', 'error')
        return { ok: false, error: 'error' } as unknown as T
      }
    },
    [router, toast],
  )

  const close = useCallback(() => setPanel(null), [])

  const value = useMemo<Ctx>(
    () => ({
      cabins,
      toast,
      run,
      openNewBooking: (prefill) => setPanel({ type: 'new', prefill }),
      openBlock: (prefill) => setPanel({ type: 'block', prefill }),
      openBooking: (booking) => setPanel({ type: 'booking', booking }),
      openItem: (item, cabinName) => setPanel({ type: 'item', item, cabinName }),
    }),
    [cabins, toast, run],
  )

  return (
    <AdminCtx.Provider value={value}>
      {children}

      <Drawer open={panel?.type === 'new'} onClose={close} title="Nueva reserva" subtitle="Teléfono, WhatsApp, transferencia… queda confirmada y bloquea las fechas en todos los canales.">
        {panel?.type === 'new' && <NewBookingForm prefill={panel.prefill} onDone={close} />}
      </Drawer>
      <Drawer open={panel?.type === 'block'} onClose={close} title="Bloquear fechas" subtitle="Mantención, uso propio, etc. También se cierran en Booking y Airbnb." width={460}>
        {panel?.type === 'block' && <BlockForm prefill={panel.prefill} onDone={close} />}
      </Drawer>
      {panel?.type === 'booking' && <BookingDetail booking={panel.booking} onClose={close} />}
      {panel?.type === 'item' && <ItemDetail item={panel.item} cabinName={panel.cabinName} onClose={close} />}

      {mounted &&
        createPortal(
          <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[80] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:pr-6">
            {toasts.map((t) => (
              <div
                key={t.id}
                role={t.tone === 'error' ? 'alert' : 'status'}
                className={`pointer-events-auto max-w-[420px] rounded-xl border px-4 py-3 text-sm font-medium shadow-[0_16px_40px_rgba(0,0,0,.45)] [animation:toast-in_.3s_cubic-bezier(.2,.7,.2,1)_both] ${
                  t.tone === 'error' ? 'border-[#E6837A]/40 bg-[#3A1D1A] text-[#F9CFC9]' : 'border-[#4ADE80]/25 bg-[#17301F] text-[#C4F0D2]'
                }`}
              >
                {t.text}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </AdminCtx.Provider>
  )
}
