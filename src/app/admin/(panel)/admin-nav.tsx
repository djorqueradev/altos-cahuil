'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IconBan, IconCalendar, IconHome, IconList, IconSync } from '@/components/icons'

const items = [
  { href: '/admin', label: 'Calendario', Icon: IconCalendar },
  { href: '/admin/reservas', label: 'Reservas', Icon: IconList },
  { href: '/admin/bloqueos', label: 'Bloqueos', Icon: IconBan },
  { href: '/admin/cabanas', label: 'Cabañas y tarifas', Icon: IconHome },
  { href: '/admin/canales', label: 'Booking / Airbnb', Icon: IconSync },
]

export function AdminNav() {
  const path = usePathname()
  return (
    <nav aria-label="Administración" className="flex flex-row gap-1 overflow-x-auto text-sm font-medium md:flex-col">
      {items.map(({ href, label, Icon }) => {
        const active = href === '/admin' ? path === '/admin' : path.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`fx-side flex shrink-0 items-center gap-3 rounded-[10px] px-3 py-[11px] ${active ? 'bg-surface-2 text-cream' : 'text-sub'}`}
          >
            <Icon size={18} className={active ? 'text-amber' : ''} strokeWidth={2} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
