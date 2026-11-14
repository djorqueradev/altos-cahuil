import Link from 'next/link'
import { site } from '@/lib/site'

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1440px] flex-wrap justify-between gap-10 px-5 pb-28 pt-16 md:px-[5%] md:pb-12">
        <div>
          <p className="font-display text-[34px] font-semibold">{site.name}</p>
          <p className="mt-2 text-sm text-muted">
            {site.address} · {site.locality}
          </p>
        </div>
        <div className="flex flex-col gap-2.5 text-[15px]">
          <a href={site.phoneHref} className="fx-link self-start text-amber">{site.phone}</a>
          <a href={`mailto:${site.email}`} className="fx-link self-start text-amber">{site.email}</a>
          <a href={site.whatsappHref} target="_blank" rel="noreferrer" className="fx-link self-start text-amber">
            Escríbenos por WhatsApp
          </a>
          {site.instagramHref && (
            <a href={site.instagramHref} target="_blank" rel="noreferrer" className="fx-link self-start text-amber">
              Instagram
            </a>
          )}
        </div>
        <div className="flex flex-col gap-2.5 text-sm text-muted">
          <Link href="/cabanas" className="fx-link self-start">Ver disponibilidad</Link>
          <Link href="/condiciones" className="fx-link self-start">Condiciones de reserva</Link>
        </div>
      </div>
    </footer>
  )
}
