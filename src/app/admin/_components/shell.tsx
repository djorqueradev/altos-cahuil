'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { IconBan, IconCalendar, IconList, IconLogout, IconSync } from '@/components/icons'
import { syncNowAction } from '../actions'
import { useAdmin } from './admin-provider'

function IconToday(p: { size?: number; className?: string }) {
  return (
    <svg width={p.size ?? 20} height={p.size ?? 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={p.className}>
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" /><circle cx="12" cy="12" r="4" />
    </svg>
  )
}
function IconTag(p: { size?: number; className?: string }) {
  return (
    <svg width={p.size ?? 20} height={p.size ?? 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={p.className}>
      <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9z" /><circle cx="8" cy="8" r="1.5" />
    </svg>
  )
}
function IconGear(p: { size?: number; className?: string }) {
  return (
    <svg width={p.size ?? 20} height={p.size ?? 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={p.className}>
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  )
}

const NAV = [
  { href: '/admin', label: 'Hoy', Icon: IconToday },
  { href: '/admin/calendario', label: 'Calendario', Icon: IconCalendar },
  { href: '/admin/reservas', label: 'Reservas', Icon: IconList },
  { href: '/admin/tarifas', label: 'Tarifas', Icon: IconTag },
  { href: '/admin/canales', label: 'Booking / Airbnb', Icon: IconSync, short: 'Canales' },
  { href: '/admin/configuracion', label: 'Configuración', Icon: IconGear, short: 'Ajustes' },
]

export function Shell({ email, signOut, children }: { email: string; signOut: () => Promise<void>; children: ReactNode }) {
  const path = usePathname()
  const { openNewBooking, openBlock, run } = useAdmin()
  const [syncing, setSyncing] = useState(false)
  const isActive = (href: string) => (href === '/admin' ? path === '/admin' : path.startsWith(href))

  return (
    <div className="min-h-dvh bg-[#100E0C] text-cream md:flex">
      {/* Barra lateral (escritorio) */}
      <aside className="hidden w-[248px] shrink-0 flex-col border-r border-cream/[0.06] bg-[#0B0A09] px-4 py-6 md:sticky md:top-0 md:flex md:h-dvh">
        <Link href="/admin" className="px-2.5 leading-none">
          <span className="block font-display text-[26px] font-semibold">Altos de Cahuil</span>
          <span className="mt-2 block text-[10px] uppercase tracking-[3px] text-muted">Administración</span>
        </Link>
        <button type="button" onClick={() => openNewBooking()} className="fx-btn mt-7 flex h-11 items-center justify-center gap-2 rounded-xl bg-amber text-sm font-bold text-amber-ink">
          <span className="text-lg leading-none">+</span> Nueva reserva
        </button>
        <button type="button" onClick={() => openBlock()} className="fx-ghost mt-2 flex h-10 items-center justify-center gap-2 rounded-xl border border-cream/15 text-[13px] font-semibold text-sub">
          <IconBan size={16} /> Bloquear fechas
        </button>
        <nav aria-label="Panel" className="mt-6 flex flex-col gap-1 text-sm font-medium">
          {NAV.map(({ href, label, Icon }) => {
            const a = isActive(href)
            return (
              <Link key={href} href={href} aria-current={a ? 'page' : undefined} className={`fx-side flex items-center gap-3 rounded-[10px] px-3 py-[10px] ${a ? 'bg-surface-2 text-cream' : 'text-sub'}`}>
                <Icon size={18} className={a ? 'text-amber' : ''} />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-3 px-2.5 text-xs text-muted">
          <button
            type="button"
            disabled={syncing}
            onClick={async () => { setSyncing(true); await run(syncNowAction); setSyncing(false) }}
            className="fx-ghost flex h-9 items-center gap-2 self-start rounded-full border border-cream/15 px-3 text-sub"
          >
            <IconSync size={14} className={syncing ? 'fx-spin' : ''} /> {syncing ? 'Sincronizando…' : 'Sincronizar canales'}
          </button>
          <Link href="/" target="_blank" className="fx-link self-start">Ver sitio público ↗</Link>
          <span className="truncate" title={email}>{email}</span>
          <form action={signOut}>
            <button type="submit" className="fx-link flex items-center gap-1.5 text-sub"><IconLogout size={14} /> Cerrar sesión</button>
          </form>
        </div>
      </aside>

      {/* Barra superior (celular) */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-cream/[0.06] bg-[#0B0A09]/95 px-4 py-3 backdrop-blur md:hidden">
        <Link href="/admin" className="font-display text-[22px] font-semibold leading-none">Altos de Cahuil</Link>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Bloquear fechas" onClick={() => openBlock()} className="fx-ghost flex h-10 w-10 items-center justify-center rounded-full border border-cream/15"><IconBan size={18} /></button>
          <button type="button" onClick={() => openNewBooking()} className="fx-btn flex h-10 items-center gap-1.5 rounded-full bg-amber px-4 text-sm font-bold text-amber-ink"><span className="text-lg leading-none">+</span> Reserva</button>
        </div>
      </header>

      <main className="min-w-0 flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-12 md:pt-8 xl:px-10">
        <div className="mx-auto max-w-[1400px]">{children}</div>
      </main>

      {/* Pestañas inferiores (celular) */}
      <nav aria-label="Panel (móvil)" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-cream/[0.08] bg-[#0B0A09]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.map(({ href, label, short, Icon }) => {
          const a = isActive(href)
          return (
            <Link key={href} href={href} aria-current={a ? 'page' : undefined} className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold ${a ? 'text-amber' : 'text-muted'}`}>
              <Icon size={20} />
              {short ?? label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

