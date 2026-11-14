'use client'

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { IconChevronLeft, IconChevronRight } from '@/components/icons'
import { addDays, addMonths, daysInMonth, formatDateFull, formatMonth, startOfMonth, weekdayMondayFirst } from '@/lib/dates'

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']

/** 'YYYY-MM-DD' → 'dd/mm/aaaa' */
export function toDMY(d: string) {
  return `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`
}

type Props = {
  value: string
  onChange: (v: string) => void
  /** Fecha mínima seleccionable (YYYY-MM-DD) */
  min?: string
  /** Si se indica, se envía en formularios como <input type="hidden"> */
  name?: string
  placeholder?: string
  /** Clases del botón que muestra la fecha */
  className?: string
  /** Mes que se muestra al abrir si no hay valor */
  openTo?: string
  'aria-label'?: string
}

/** Selector de fecha propio: siempre muestra dd/mm/aaaa, sin depender del idioma del navegador. */
export function DatePicker({ value, onChange, min, name, placeholder = 'dd/mm/aaaa', className = '', openTo, ...rest }: Props) {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => startOfMonth(value || openTo || min || new Date().toISOString().slice(0, 10)))
  const [pos, setPos] = useState<CSSProperties>({})
  const wrap = useRef<HTMLDivElement>(null)
  const pop = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const popId = useId()

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (!wrap.current?.contains(t) && !pop.current?.contains(t)) setOpen(false)
    }
    const onMove = () => place()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        btn.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
    }
  }, [open])

  /** Calcula dónde flota el calendario (fijo a la ventana, para que ningún contenedor lo recorte). */
  function place() {
    const r = btn.current?.getBoundingClientRect()
    if (!r) return
    const W = Math.min(300, window.innerWidth - 32)
    const H = 370
    const left = Math.max(16, Math.min(r.left, window.innerWidth - W - 16))
    const below = window.innerHeight - r.bottom
    const up = below < H + 16 && r.top > below
    setPos(up ? { left, width: W, bottom: window.innerHeight - r.top + 10 } : { left, width: W, top: r.bottom + 10 })
  }

  function toggle() {
    if (!open) {
      place()
      setMonth(startOfMonth(value || openTo || min || new Date().toISOString().slice(0, 10)))
    }
    setOpen((o) => !o)
  }

  function pick(d: string) {
    onChange(d)
    setOpen(false)
    btn.current?.focus()
  }

  const lead = weekdayMondayFirst(month)
  const count = daysInMonth(month)
  const canPrev = !min || addMonths(month, -1) >= startOfMonth(min)

  return (
    <div ref={wrap} className="relative">
      {name && <input type="hidden" name={name} value={value} />}
      <button
        ref={btn}
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popId : undefined}
        aria-label={rest['aria-label'] ? `${rest['aria-label']}: ${value ? formatDateFull(value) : 'sin elegir'}` : undefined}
        className={`text-left tabular-nums ${value ? 'text-cream' : 'text-muted/80'} ${className}`}
      >
        {value ? toDMY(value) : placeholder}
      </button>

      {open && createPortal(
        <div
          ref={pop}
          id={popId}
          role="dialog"
          aria-label="Elegir fecha"
          className="fx-up fixed z-[60] rounded-2xl border border-cream/15 bg-surface p-4 font-sans text-cream shadow-[0_24px_60px_rgba(0,0,0,.55)]"
          style={{ ...pos, animationDuration: '.35s' }}
        >
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              aria-label="Mes anterior"
              disabled={!canPrev}
              onClick={() => setMonth((m) => addMonths(m, -1))}
              className="fx-ghost flex h-9 w-9 items-center justify-center rounded-full border border-cream/20 disabled:opacity-30"
            >
              <IconChevronLeft size={14} strokeWidth={2.4} />
            </button>
            <span className="text-sm font-bold">{formatMonth(month)}</span>
            <button
              type="button"
              aria-label="Mes siguiente"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              className="fx-ghost flex h-9 w-9 items-center justify-center rounded-full border border-cream/20"
            >
              <IconChevronRight size={14} strokeWidth={2.4} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((w) => (
              <span key={w} className="py-1 text-[11px] font-semibold text-muted">{w}</span>
            ))}
            {Array.from({ length: lead }).map((_, i) => <span key={`e${i}`} />)}
            {Array.from({ length: count }).map((_, i) => {
              const d = addDays(month, i)
              const disabled = !!min && d < min
              const selected = d === value
              return (
                <button
                  key={d}
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(d)}
                  aria-pressed={selected}
                  aria-label={formatDateFull(d)}
                  className={`fx-day rounded-full py-2 text-[13px] font-semibold disabled:cursor-not-allowed disabled:text-muted/35 ${
                    selected ? 'bg-amber text-amber-ink' : 'text-cream'
                  }`}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

/** Versión para formularios (server actions): guarda su propio estado y envía `name` como YYYY-MM-DD. */
export function DateField({ name, min, defaultValue = '', className = '', ...rest }: { name: string; min?: string; defaultValue?: string; className?: string; 'aria-label'?: string }) {
  const [v, setV] = useState(defaultValue)
  return <DatePicker name={name} min={min} value={v} onChange={setV} className={className} {...rest} />
}
