import type { Metadata, Viewport } from 'next'
import '@fontsource/manrope/400.css'
import '@fontsource/manrope/500.css'
import '@fontsource/manrope/600.css'
import '@fontsource/manrope/700.css'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/cormorant-garamond/500-italic.css'
import './globals.css'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Altos de Cahuil — Cabañas en Cáhuil, Pichilemu',
    template: '%s · Altos de Cahuil',
  },
  description:
    'Dos cabañas de madera con terraza, cocina equipada y fogón en la costa de Cáhuil, pasado Punta de Lobos. Reserva directo y paga con Mercado Pago.',
  openGraph: {
    title: 'Altos de Cahuil — Cabañas en Cáhuil, Pichilemu',
    description: 'Dos cabañas de madera con terraza y fogón en la costa de Cáhuil.',
    images: ['/fotos/hero_lobos.jpg'],
    locale: 'es_CL',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#12100E',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body className="min-h-dvh bg-ink text-cream antialiased">{children}</body>
    </html>
  )
}
