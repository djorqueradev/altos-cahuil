import type { Metadata } from 'next'
import Link from 'next/link'
import { IconLogout } from '@/components/icons'
import { requireAdmin } from '@/lib/admin-auth'
import { signOut } from '../actions'
import { AdminNav } from './admin-nav'

export const metadata: Metadata = { title: 'Panel', robots: { index: false } }

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin()
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="flex flex-col gap-6 border-b border-line bg-ink-deep px-4 py-5 md:sticky md:top-0 md:h-dvh md:w-[250px] md:shrink-0 md:border-b-0 md:border-r md:py-7">
        <Link href="/admin" className="px-2.5 leading-none">
          <span className="block font-display text-[26px] font-semibold">Altos de Cahuil</span>
          <span className="mt-2 block text-[11px] uppercase tracking-[3px] text-muted">Administración</span>
        </Link>
        <AdminNav />
        <div className="mt-auto hidden flex-col gap-3 px-2.5 text-xs text-muted md:flex">
          <Link href="/" target="_blank" className="fx-link self-start">Ver sitio público ↗</Link>
          <span className="truncate">{user.email}</span>
          <form action={signOut}>
            <button type="submit" className="fx-ghost flex items-center gap-2 rounded-full border border-cream/20 px-3 py-2 text-sub">
              <IconLogout size={16} /> Salir
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-5 py-8 md:px-9">{children}</main>
    </div>
  )
}
