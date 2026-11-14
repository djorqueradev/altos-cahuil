'use client'

import Link from 'next/link'
import { useState } from 'react'
import { IconClose, IconMenu } from '@/components/icons'
import { site } from '@/lib/site'

const links = [
  { href: '/#cabanas', label: 'Cabañas' },
  { href: '/#experiencia', label: 'Experiencia' },
  { href: '/#galeria', label: 'Galería' },
  { href: '/#ubicacion', label: 'Ubicación' },
]

export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const [open, setOpen] = useState(false)

  return (
    <header
      className={
        overlay
          ? 'absolute inset-x-0 top-0 z-30'
          : 'relative z-30 border-b border-line bg-ink'
      }
    >
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-5 md:px-[5%] md:py-7">
        <Link href="/" className="flex flex-col leading-none text-cream" onClick={() => setOpen(false)}>
          <span className="font-display text-2xl font-semibold tracking-wide md:text-[30px]">{site.name}</span>
          <span className="mt-1.5 text-[10px] uppercase tracking-[4px] text-sand md:text-[11px]">{site.tagline}</span>
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-8 text-sm font-medium md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="fx-link text-cream">
              {l.label}
            </Link>
          ))}
          <Link href="/cabanas" className="fx-btn rounded-full bg-amber px-[22px] py-3 font-bold text-amber-ink">
            Reservar
          </Link>
        </nav>

        <button
          type="button"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="fx-ghost flex h-11 w-11 items-center justify-center rounded-full border border-cream/35 bg-ink/30 text-cream md:hidden"
        >
          {open ? <IconClose size={18} /> : <IconMenu size={18} />}
        </button>
      </div>

      {open && (
        <nav
          aria-label="Principal (móvil)"
          className="fx-up mx-4 mb-4 flex flex-col gap-1 rounded-2xl border border-line bg-surface/95 p-3 backdrop-blur md:hidden"
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-xl px-4 py-3 text-base text-cream hover:bg-surface-2"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/cabanas"
            onClick={() => setOpen(false)}
            className="fx-btn mt-2 rounded-xl bg-amber px-4 py-3 text-center font-bold text-amber-ink"
          >
            Reservar
          </Link>
        </nav>
      )}
    </header>
  )
}
