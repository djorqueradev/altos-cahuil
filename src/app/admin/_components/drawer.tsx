'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from '@/components/icons'

/** Panel lateral (a pantalla completa en celular). */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 520,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  width?: number
}) {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    setTimeout(() => panel.current?.focus(), 30)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed inset-0 z-[70] flex justify-end">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-[2px] [animation:fx-fade_.25s_ease_both]" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="relative flex h-full w-full flex-col border-l border-cream/10 bg-[#171411] font-sans text-cream shadow-[-24px_0_60px_rgba(0,0,0,.5)] outline-none [animation:drawer-in_.32s_cubic-bezier(.2,.7,.2,1)_both]"
        style={{ maxWidth: width }}
      >
        <header className="flex items-start justify-between gap-4 border-b border-cream/[0.07] px-5 py-4 md:px-6">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{title}</h2>
            {subtitle && <div className="mt-1 text-[13px] text-muted">{subtitle}</div>}
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar panel" className="fx-ghost -mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cream/15">
            <IconClose size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">{children}</div>
        {footer && <footer className="border-t border-cream/[0.07] bg-[#171411] px-5 py-4 md:px-6">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}
