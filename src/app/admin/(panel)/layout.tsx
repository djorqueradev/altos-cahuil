import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/admin-auth'
import { getAllCabinsAdmin } from '@/lib/data'
import { signOut } from '../actions'
import { AdminProvider } from '../_components/admin-provider'
import { Shell } from '../_components/shell'

export const metadata: Metadata = { title: { default: 'Panel', template: '%s · Panel Altos de Cahuil' }, robots: { index: false } }

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin()
  const cabins = await getAllCabinsAdmin()
  return (
    <AdminProvider
      cabins={cabins.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        capacity: c.capacity,
        price_per_night: c.price_per_night,
        cleaning_fee: c.cleaning_fee,
        min_nights: c.min_nights,
      }))}
    >
      <Shell email={user.email ?? ''} signOut={signOut}>
        {children}
      </Shell>
    </AdminProvider>
  )
}
