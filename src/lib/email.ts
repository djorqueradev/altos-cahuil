import 'server-only'
import { env } from '@/lib/env'
import { formatDateFull } from '@/lib/dates'
import { formatCLP } from '@/lib/money'
import { site } from '@/lib/site'
import { getSettings, orConsult } from '@/lib/settings'
import type { Booking } from '@/lib/types'

/** Envía correos con Resend si RESEND_API_KEY está configurada. Si no, no hace nada. */
async function send(to: string | string[], subject: string, html: string) {
  const key = env.resendApiKey()
  if (!key) return
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.emailFrom(), to, subject, html, reply_to: (await getSettings()).contact_email }),
  })
  if (!res.ok) console.error('Resend error', res.status, await res.text())
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

function bookingTable(b: Booking, cabinName: string) {
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 0;color:#7a6f63">${k}</td><td style="padding:6px 0;text-align:right;font-weight:600">${esc(v)}</td></tr>`
  return `<table style="width:100%;border-collapse:collapse;font-size:15px">
    ${row('Código', b.code)}
    ${row('Cabaña', cabinName)}
    ${row('Llegada', formatDateFull(b.check_in))}
    ${row('Salida', formatDateFull(b.check_out))}
    ${row('Huéspedes', String(b.guests))}
    ${row('Total pagado', formatCLP(b.total))}
  </table>`
}

export async function sendBookingConfirmed(b: Booking, cabinName: string) {
  const s = await getSettings()
  const guestHtml = `
  <div style="font-family:Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1A120A">
    <h1 style="font-family:Georgia,serif;font-weight:500;font-size:32px">¡Reserva confirmada!</h1>
    <p>Hola ${esc(b.guest_first_name)}, te esperamos en <strong>${site.name}</strong>.</p>
    ${bookingTable(b, cabinName)}
    <p style="margin-top:24px">Dirección: ${site.address}, ${site.locality}. ${site.directionsHint}</p>
    <p>Check-in desde las ${orConsult(s.check_in_from)} · Check-out hasta las ${orConsult(s.check_out_until)}.</p>
    <p>Antes de tu llegada te escribiremos por WhatsApp con las indicaciones. Cualquier duda: ${s.contact_phone} · ${s.contact_email}</p>
  </div>`
  await send(b.guest_email, `Reserva ${b.code} confirmada · ${site.name}`, guestHtml)

  const owner = env.ownerEmail()
  if (owner) {
    const ownerHtml = `
    <div style="font-family:Helvetica,Arial,sans-serif;max-width:560px;color:#1A120A">
      <h2>Nueva reserva pagada</h2>
      ${bookingTable(b, cabinName)}
      <p><strong>${esc(b.guest_first_name)} ${esc(b.guest_last_name)}</strong> · ${esc(b.guest_email)} · ${esc(b.guest_phone)}</p>
      ${b.arrival_window ? `<p>Llegada: ${esc(b.arrival_window)}</p>` : ''}
      ${b.notes ? `<p>Comentarios: ${esc(b.notes)}</p>` : ''}
    </div>`
    await send(owner, `Nueva reserva ${b.code} · ${cabinName}`, ownerHtml)
  }
}

export async function sendOwnerAlert(subject: string, text: string) {
  const owner = env.ownerEmail()
  if (owner) await send(owner, subject, `<p style="font-family:Helvetica,Arial,sans-serif">${esc(text)}</p>`)
}
