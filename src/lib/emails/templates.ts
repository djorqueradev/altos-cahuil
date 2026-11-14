// Plantillas de todos los correos. Funciones puras: reciben los datos y devuelven
// asunto, texto oculto de vista previa, HTML y versión en texto plano.
import { diffDays, formatDateFull, formatDateShort } from '@/lib/dates'
import { formatCLP } from '@/lib/money'
import { site } from '@/lib/site'
import { checkInText, checkOutText } from '@/lib/settings-format'
import type { Settings } from '@/lib/settings'
import type { Booking } from '@/lib/types'
import {
  C,
  button,
  buttons,
  codePill,
  details,
  divider,
  esc,
  eyebrow,
  h1,
  h2,
  infoList,
  layout,
  notice,
  p,
  type FooterInfo,
  type Row,
} from './layout'

export type EmailCabin = { name: string; slug: string }
export type EmailContext = { siteUrl: string; settings: Settings; booking: Booking; cabin: EmailCabin }
export type Email = { subject: string; preheader: string; html: string; text: string }

export type TemplateId =
  | 'guest-confirmed'
  | 'guest-reminder'
  | 'guest-thanks'
  | 'guest-abandoned'
  | 'guest-cancelled'
  | 'owner-new'
  | 'owner-abandoned'
  | 'owner-alert'

export const TEMPLATES: { id: TemplateId; to: 'huésped' | 'ustedes'; name: string; when: string }[] = [
  { id: 'guest-confirmed', to: 'huésped', name: 'Reserva confirmada', when: 'Apenas Mercado Pago aprueba el pago (o al crear una reserva manual, si marcas "enviar confirmación").' },
  { id: 'guest-reminder', to: 'huésped', name: 'Recordatorio de llegada', when: 'Unos días antes del check-in, con la dirección, horarios y cómo avisar la hora de llegada.' },
  { id: 'guest-thanks', to: 'huésped', name: 'Gracias por tu visita', when: 'El día después del check-out, invitando a volver a reservar directo.' },
  { id: 'guest-abandoned', to: 'huésped', name: 'Pago no completado', when: 'Cuando vence el plazo para pagar y las fechas se liberan; trae un botón para reintentar.' },
  { id: 'guest-cancelled', to: 'huésped', name: 'Reserva cancelada', when: 'Cuando cancelan una reserva desde el panel.' },
  { id: 'owner-new', to: 'ustedes', name: 'Nueva reserva pagada', when: 'Cada vez que alguien reserva y paga en la web.' },
  { id: 'owner-abandoned', to: 'ustedes', name: 'Reserva sin pagar', when: 'Cuando alguien empezó a reservar pero no pagó: útil para contactarlo.' },
  { id: 'owner-alert', to: 'ustedes', name: 'Alerta', when: 'Si un pago no cuadra o llega tarde y las fechas ya se ocuparon.' },
]

/* ---------------- utilidades ---------------- */

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const longDate = (d: string) => cap(formatDateFull(d))
const shortRange = (b: Booking) => `${formatDateShort(b.check_in)} – ${formatDateShort(b.check_out)}`
const nightsLabel = (n: number) => `${n} ${n === 1 ? 'noche' : 'noches'}`
const guestsLabel = (n: number) => `${n} ${n === 1 ? 'persona' : 'personas'}`
const hasEmail = (s: string | null | undefined) => !!s && /.+@.+\..+/.test(s)
const hasPhone = (s: string | null | undefined) => !!s && s.replace(/\D/g, '').length >= 8

function wa(number: string, text?: string) {
  const n = number.replace(/\D/g, '')
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

/** WhatsApp del huésped (asume Chile si escribió 9 dígitos). */
function guestWa(phone: string, text: string) {
  let n = phone.replace(/\D/g, '')
  if (n.length === 9 && n.startsWith('9')) n = `56${n}`
  return wa(n, text)
}

function instagramUrl(handle: string) {
  const h = handle.trim()
  if (!h) return undefined
  if (/^https?:\/\//.test(h)) return h
  return `https://instagram.com/${h.replace(/^@/, '')}`
}

function footer(ctx: { siteUrl: string; settings: Settings }, reason: string): FooterInfo {
  const s = ctx.settings
  return {
    siteUrl: ctx.siteUrl,
    address: `${site.address}, ${site.locality} · ${site.region}`,
    phone: s.contact_phone,
    email: s.contact_email,
    whatsappUrl: wa(s.whatsapp),
    instagramUrl: instagramUrl(s.instagram),
    reason,
  }
}

const hero = (siteUrl: string, name: string, alt: string) => ({ src: `${siteUrl}/email/${name}.jpg`, alt })

function stayRows(b: Booking, cabin: EmailCabin, s: Settings): Row[] {
  return [
    { label: 'Cabaña', value: cabin.name },
    { label: 'Llegada', value: longDate(b.check_in), hint: checkInText(s) || 'Te confirmamos el horario' },
    { label: 'Salida', value: longDate(b.check_out), hint: checkOutText(s) || 'Te confirmamos el horario' },
    { label: 'Estadía', value: `${nightsLabel(b.nights || diffDays(b.check_in, b.check_out))} · ${guestsLabel(b.guests)}` },
  ]
}

function moneyRows(b: Booking): Row[] {
  if (b.source === 'manual') {
    const rows: Row[] = [{ label: 'Total de la estadía', value: formatCLP(b.total), strong: true }]
    if (b.amount_paid > 0) rows.push({ label: 'Abonado', value: formatCLP(b.amount_paid) })
    const due = b.total - b.amount_paid
    if (due > 0) rows.push({ label: 'Saldo por pagar', value: formatCLP(due), hint: 'Lo coordinamos contigo antes de tu llegada' })
    return rows
  }
  const rows: Row[] = [{ label: `Estadía (${nightsLabel(b.nights)})`, value: formatCLP(b.subtotal) }]
  if (b.cleaning_fee > 0) rows.push({ label: 'Aseo', value: formatCLP(b.cleaning_fee) })
  rows.push({ label: 'Total pagado', value: formatCLP(b.amount_paid || b.total), strong: true, hint: 'Mercado Pago' })
  return rows
}

function policies(s: Settings) {
  return infoList([
    { title: 'Cancelación', text: s.cancellation_policy },
    { title: 'Mascotas', text: s.pets_policy },
    { title: 'Normas de la casa', text: s.house_rules },
  ])
}

function directions() {
  return (
    h2('Cómo llegar') +
    p(`<strong>${esc(site.address)}, ${esc(site.locality)}</strong><br>${esc(site.directionsHint)}`) +
    buttons(button(site.mapsHref, 'Abrir en Google Maps', 'secondary'), button(site.wazeHref, 'Abrir en Waze', 'secondary'))
  )
}

/** Texto plano: une líneas y quita vacías repetidas. */
function text(...lines: (string | false | null | undefined)[]) {
  return lines
    .filter((l) => l !== false && l !== null && l !== undefined)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function textStay(b: Booking, cabin: EmailCabin, s: Settings) {
  return text(
    `Código: ${b.code}`,
    `Cabaña: ${cabin.name}`,
    `Llegada: ${longDate(b.check_in)}${checkInText(s) ? ` (${checkInText(s).toLowerCase()})` : ''}`,
    `Salida: ${longDate(b.check_out)}${checkOutText(s) ? ` (${checkOutText(s).toLowerCase()})` : ''}`,
    `Estadía: ${nightsLabel(b.nights)} · ${guestsLabel(b.guests)}`,
  )
}

function textFooter(ctx: { siteUrl: string; settings: Settings }) {
  const s = ctx.settings
  return text('—', 'Altos de Cahuil', `${site.address}, ${site.locality}`, `WhatsApp / teléfono: ${s.contact_phone}`, s.contact_email, ctx.siteUrl)
}

/* ---------------- huésped ---------------- */

export function guestConfirmed(ctx: EmailContext): Email {
  const { booking: b, cabin, settings: s, siteUrl } = ctx
  const bookingUrl = `${siteUrl}/reserva/${b.id}`
  const icsUrl = `${siteUrl}/api/reserva/${b.id}/ics`
  const helloWa = wa(s.whatsapp, `Hola, tengo una reserva (${b.code}) para el ${formatDateShort(b.check_in)}.`)
  const due = b.total - b.amount_paid
  const subject = `¡Reserva confirmada! ${cabin.name} · ${shortRange(b)}`
  const preheader = `Te esperamos el ${formatDateFull(b.check_in)}. Aquí tienes todos los detalles de tu estadía.`

  const body =
    eyebrow('Reserva confirmada') +
    h1(`¡Nos vemos pronto, ${b.guest_first_name}!`) +
    p(`Tu estadía en <strong>${esc(cabin.name)}</strong> está confirmada. Guarda este correo: tiene todo lo que necesitas para llegar.`) +
    codePill(b.code) +
    details(stayRows(b, cabin, s), { title: 'Tu estadía' }) +
    details(moneyRows(b), { title: b.source === 'manual' ? 'Pago' : 'Pago recibido' }) +
    buttons(button(bookingUrl, 'Ver mi reserva'), button(icsUrl, 'Agregar a mi calendario', 'secondary')) +
    divider() +
    directions() +
    divider() +
    h2('Antes de llegar') +
    p(
      b.arrival_window
        ? `Nos contaste que llegas <strong>${esc(b.arrival_window)}</strong>. Unos días antes te escribiremos por WhatsApp para coordinar la entrega de la cabaña.`
        : 'Unos días antes te escribiremos por WhatsApp para coordinar tu hora de llegada y la entrega de la cabaña.',
    ) +
    (due > 0 && b.source === 'manual' ? notice(`Tienes un saldo pendiente de <strong>${formatCLP(due)}</strong>. Lo coordinamos contigo antes de tu llegada.`) : '') +
    policies(s) +
    divider() +
    p('¿Alguna pregunta o necesitas algo especial? Respóndenos este correo o escríbenos por WhatsApp.', { mb: 10 }) +
    buttons(button(helloWa, 'Escribir por WhatsApp', 'dark'))

  return {
    subject,
    preheader,
    html: layout({ title: subject, preheader, body, hero: hero(siteUrl, 'confirmada', 'Las cabañas de Altos de Cahuil al atardecer'), footer: footer(ctx, `Recibes este correo por tu reserva ${b.code}`) }),
    text: text(
      `¡Nos vemos pronto, ${b.guest_first_name}!`,
      '',
      `Tu estadía en ${cabin.name} está confirmada.`,
      '',
      textStay(b, cabin, s),
      b.source === 'manual'
        ? text(`Total: ${formatCLP(b.total)}`, b.amount_paid > 0 && `Abonado: ${formatCLP(b.amount_paid)}`, due > 0 && `Saldo por pagar: ${formatCLP(due)}`)
        : `Total pagado: ${formatCLP(b.amount_paid || b.total)} (Mercado Pago)`,
      '',
      `Ver tu reserva: ${bookingUrl}`,
      `Agregar al calendario: ${icsUrl}`,
      '',
      `Cómo llegar: ${site.address}, ${site.locality}. ${site.directionsHint}`,
      `Google Maps: ${site.mapsHref}`,
      '',
      'Unos días antes te escribiremos por WhatsApp para coordinar tu llegada.',
      s.cancellation_policy && `Cancelación: ${s.cancellation_policy}`,
      s.pets_policy && `Mascotas: ${s.pets_policy}`,
      s.house_rules && `Normas de la casa: ${s.house_rules}`,
      '',
      textFooter(ctx),
    ),
  }
}

export function guestReminder(ctx: EmailContext, today: string): Email {
  const { booking: b, cabin, settings: s, siteUrl } = ctx
  const days = Math.max(0, diffDays(today, b.check_in))
  const when = days <= 1 ? 'mañana' : `en ${days} días`
  const subject = days <= 1 ? `Mañana te esperamos en Altos de Cahuil` : `Faltan ${days} días para tu llegada a Altos de Cahuil`
  const preheader = `Llegas ${when}: dirección, horarios y cómo avisarnos tu hora de llegada.`
  const name = `${b.guest_first_name} ${b.guest_last_name}`.replace(/\s+-$/, '')
  const arrivalWa = wa(s.whatsapp, `Hola, soy ${name} (reserva ${b.code}). Llegaré el ${formatDateShort(b.check_in)} aproximadamente a las `)
  const due = b.total - b.amount_paid

  const body =
    eyebrow(`Llegas ${when}`) +
    h1(`Ya casi, ${b.guest_first_name}`) +
    p(`Todo está listo para recibirte en <strong>${esc(cabin.name)}</strong>. Te dejamos lo importante para el viaje.`) +
    details([...stayRows(b, cabin, s), { label: 'Código', value: b.code }], { title: 'Tu estadía' }) +
    h2('Avísanos tu hora de llegada') +
    p('Así tenemos la cabaña lista y alguien esperándote. Solo toma un mensaje:') +
    buttons(button(arrivalWa, 'Avisar por WhatsApp')) +
    (due > 0 ? notice(`Recuerda que queda un saldo de <strong>${formatCLP(due)}</strong> por pagar.`) : '') +
    divider() +
    directions() +
    p('Te recomendamos guardar la dirección en tu GPS antes de salir.', { size: 14, color: C.sub }) +
    divider() +
    h2('Bueno saber') +
    infoList([
      { title: 'Check-in', text: checkInText(s) ? `${checkInText(s)}. Si llegas fuera de ese horario, avísanos antes.` : 'Coordinamos el horario contigo.' },
      { title: 'Check-out', text: checkOutText(s) ? `${checkOutText(s)}.` : 'Coordinamos el horario contigo.' },
      ...site.stayTips.map((t) => ({ title: t.title, text: t.text })),
      { title: 'Mascotas', text: s.pets_policy },
      { title: 'Normas de la casa', text: s.house_rules },
    ]) +
    buttons(button(`${siteUrl}/reserva/${b.id}`, 'Ver mi reserva', 'secondary'))

  return {
    subject,
    preheader,
    html: layout({ title: subject, preheader, body, hero: hero(siteUrl, 'recordatorio', 'Sendero hacia las cabañas'), footer: footer(ctx, `Recibes este correo por tu reserva ${b.code}`) }),
    text: text(
      `Ya casi, ${b.guest_first_name}: llegas ${when}.`,
      '',
      textStay(b, cabin, s),
      '',
      `Avísanos tu hora de llegada por WhatsApp: ${arrivalWa}`,
      due > 0 && `Saldo por pagar: ${formatCLP(due)}`,
      '',
      `Cómo llegar: ${site.address}, ${site.locality}. ${site.directionsHint}`,
      `Google Maps: ${site.mapsHref}`,
      `Waze: ${site.wazeHref}`,
      '',
      s.pets_policy && `Mascotas: ${s.pets_policy}`,
      s.house_rules && `Normas de la casa: ${s.house_rules}`,
      '',
      textFooter(ctx),
    ),
  }
}

export function guestThanks(ctx: EmailContext): Email {
  const { booking: b, settings: s, siteUrl } = ctx
  const subject = `Gracias por tu visita, ${b.guest_first_name}`
  const preheader = 'Fue un gusto recibirte. Las cabañas te esperan para la próxima.'
  const ig = instagramUrl(s.instagram)

  const body =
    eyebrow('Gracias por venir') +
    h1('Fue un gusto recibirte') +
    p(`Esperamos que hayas descansado y disfrutado del mar, los atardeceres y la tranquilidad de Cáhuil. Gracias por elegirnos, ${esc(b.guest_first_name)}.`) +
    p('Si algo pudo ser mejor, <strong>respóndenos este correo</strong>: lo leemos nosotros mismos y nos ayuda muchísimo.') +
    notice('La próxima vez reserva directo en nuestra web: ves la disponibilidad real de ambas cabañas y pagas seguro con Mercado Pago.', 'green') +
    buttons(button(siteUrl, 'Volver a reservar'), ig ? button(ig, 'Síguenos en Instagram', 'secondary') : '') +
    divider() +
    p('¿Conoces a alguien que necesite unos días frente al mar? Comparte nuestra web con quien quieras.', { size: 14, color: C.sub, mb: 0 })

  return {
    subject,
    preheader,
    html: layout({ title: subject, preheader, body, hero: hero(siteUrl, 'gracias', 'Atardecer sobre el mar en Cáhuil'), footer: footer(ctx, `Recibes este correo por tu estadía ${b.code}`) }),
    text: text(
      `Gracias por tu visita, ${b.guest_first_name}.`,
      '',
      'Esperamos que hayas descansado y disfrutado de Cáhuil. Si algo pudo ser mejor, respóndenos este correo: lo leemos nosotros mismos.',
      '',
      `Vuelve a reservar directo: ${siteUrl}`,
      ig && `Instagram: ${ig}`,
      '',
      textFooter(ctx),
    ),
  }
}

export function guestAbandoned(ctx: EmailContext): Email {
  const { booking: b, cabin, settings: s, siteUrl } = ctx
  const retryUrl = `${siteUrl}/cabanas/${cabin.slug}?${new URLSearchParams({ llegada: b.check_in, salida: b.check_out, huespedes: String(b.guests) })}`
  const helpWa = wa(s.whatsapp, `Hola, intenté reservar ${cabin.name} del ${formatDateShort(b.check_in)} al ${formatDateShort(b.check_out)} y tuve un problema con el pago.`)
  const subject = `Tu reserva en ${cabin.name} no se completó`
  const preheader = 'No alcanzamos a recibir tu pago y las fechas se liberaron. Puedes intentarlo de nuevo.'

  const body =
    eyebrow('Pago no completado') +
    h1(`¿Lo intentamos de nuevo, ${b.guest_first_name}?`) +
    p(`Apartamos tus fechas mientras pagabas, pero no recibimos la confirmación de Mercado Pago a tiempo, así que <strong>las fechas volvieron a quedar disponibles</strong>.`) +
    details(
      [
        { label: 'Cabaña', value: cabin.name },
        { label: 'Fechas', value: `${cap(formatDateShort(b.check_in))} – ${formatDateShort(b.check_out)}`, hint: nightsLabel(b.nights) },
        { label: 'Huéspedes', value: guestsLabel(b.guests) },
        { label: 'Total', value: formatCLP(b.total), strong: true },
      ],
      { title: 'Lo que estabas reservando' },
    ) +
    buttons(button(retryUrl, 'Reintentar mi reserva')) +
    p('El botón te lleva a la cabaña con tus fechas listas (sujeto a disponibilidad).', { size: 14, color: C.sub }) +
    divider() +
    p('<strong>¿Tuviste un problema con el pago?</strong> Escríbenos y te ayudamos a terminar la reserva.', { mb: 10 }) +
    buttons(button(helpWa, 'Pedir ayuda por WhatsApp', 'dark')) +
    p('Si alcanzaste a pagar, no te preocupes: apenas Mercado Pago nos confirme, te llegará el correo de reserva confirmada.', { size: 14, color: C.sub, mb: 0 })

  return {
    subject,
    preheader,
    html: layout({ title: subject, preheader, body, hero: hero(siteUrl, 'reintentar', 'Terraza de la cabaña'), footer: footer(ctx, 'Recibes este correo porque empezaste una reserva en nuestra web') }),
    text: text(
      `Hola ${b.guest_first_name}:`,
      '',
      'No recibimos la confirmación de tu pago a tiempo, así que las fechas volvieron a quedar disponibles.',
      '',
      `Cabaña: ${cabin.name}`,
      `Fechas: ${longDate(b.check_in)} – ${longDate(b.check_out)}`,
      `Total: ${formatCLP(b.total)}`,
      '',
      `Reintentar tu reserva: ${retryUrl}`,
      `¿Problemas con el pago? WhatsApp: ${helpWa}`,
      '',
      'Si alcanzaste a pagar, te llegará la confirmación apenas Mercado Pago nos avise.',
      '',
      textFooter(ctx),
    ),
  }
}

export function guestCancelled(ctx: EmailContext): Email {
  const { booking: b, cabin, settings: s, siteUrl } = ctx
  const subject = `Reserva ${b.code} cancelada`
  const preheader = `Tu reserva en ${cabin.name} para el ${formatDateShort(b.check_in)} fue cancelada.`
  const helpWa = wa(s.whatsapp, `Hola, recibí la cancelación de mi reserva ${b.code}.`)

  const body =
    eyebrow('Reserva cancelada', C.red) +
    h1('Tu reserva fue cancelada') +
    p(`Hola ${esc(b.guest_first_name)}, te confirmamos que la siguiente reserva quedó cancelada y sus fechas fueron liberadas.`) +
    details(
      [
        { label: 'Código', value: b.code },
        { label: 'Cabaña', value: cabin.name },
        { label: 'Fechas', value: `${cap(formatDateShort(b.check_in))} – ${formatDateShort(b.check_out)}`, hint: nightsLabel(b.nights) },
      ],
      { title: 'Reserva' },
    ) +
    (b.amount_paid > 0
      ? notice(
          `Habías pagado <strong>${formatCLP(b.amount_paid)}</strong>. Si corresponde un reembolso según nuestra política de cancelación, te contactaremos para coordinarlo.${s.cancellation_policy ? `<br><br><span style="color:${C.sub}">${esc(s.cancellation_policy)}</span>` : ''}`,
        )
      : '') +
    p('¿Fue un error o quieres cambiar las fechas? Escríbenos y lo vemos juntos.', { mb: 10 }) +
    buttons(button(helpWa, 'Escribir por WhatsApp', 'dark'), button(siteUrl, 'Ver otras fechas', 'secondary'))

  return {
    subject,
    preheader,
    html: layout({ title: subject, preheader, body, hero: hero(siteUrl, 'cancelada', 'Vista al mar desde Altos de Cahuil'), footer: footer(ctx, `Recibes este correo por tu reserva ${b.code}`) }),
    text: text(
      `Hola ${b.guest_first_name}:`,
      '',
      `Tu reserva ${b.code} en ${cabin.name} (${longDate(b.check_in)} – ${longDate(b.check_out)}) fue cancelada.`,
      b.amount_paid > 0 && `Habías pagado ${formatCLP(b.amount_paid)}. Si corresponde un reembolso, te contactaremos para coordinarlo.`,
      '',
      `¿Fue un error? WhatsApp: ${helpWa}`,
      '',
      textFooter(ctx),
    ),
  }
}

/* ---------------- para ustedes ---------------- */

function guestContactRows(b: Booking): Row[] {
  const rows: Row[] = [{ label: 'Nombre', value: `${b.guest_first_name} ${b.guest_last_name}`.replace(/\s+-$/, '') }]
  if (hasPhone(b.guest_phone)) rows.push({ label: 'Teléfono', value: `<a href="tel:${esc(b.guest_phone.replace(/[^\d+]/g, ''))}" style="color:${C.ink}">${esc(b.guest_phone)}</a>`, html: true })
  if (hasEmail(b.guest_email)) rows.push({ label: 'Correo', value: `<a href="mailto:${esc(b.guest_email)}" style="color:${C.ink}">${esc(b.guest_email)}</a>`, html: true })
  if (b.guest_document) rows.push({ label: 'RUT / documento', value: b.guest_document })
  if (b.arrival_window) rows.push({ label: 'Hora de llegada', value: b.arrival_window })
  return rows
}

function contactButtons(b: Booking, greeting: string) {
  const items = []
  if (hasPhone(b.guest_phone)) items.push(button(guestWa(b.guest_phone, greeting), 'WhatsApp al huésped', 'secondary'))
  if (hasEmail(b.guest_email)) items.push(button(`mailto:${b.guest_email}`, 'Enviarle un correo', 'secondary'))
  return items
}

export function ownerNew(ctx: EmailContext): Email {
  const { booking: b, cabin, siteUrl } = ctx
  const subject = `Nueva reserva pagada · ${cabin.name} · ${shortRange(b)}`
  const preheader = `${b.guest_first_name} ${b.guest_last_name} pagó ${formatCLP(b.amount_paid || b.total)} por ${nightsLabel(b.nights)}.`
  const greeting = `Hola ${b.guest_first_name}, te escribimos de Altos de Cahuil por tu reserva ${b.code}. `

  const body =
    eyebrow('Nueva reserva · web', C.green) +
    h1(`${b.guest_first_name} ${b.guest_last_name}`) +
    p(`Reservó <strong>${esc(cabin.name)}</strong> y pagó con Mercado Pago. Las fechas ya están bloqueadas en el calendario y en Booking/Airbnb en la próxima sincronización.`) +
    details(
      [
        { label: 'Código', value: b.code },
        { label: 'Cabaña', value: cabin.name },
        { label: 'Llegada', value: longDate(b.check_in) },
        { label: 'Salida', value: longDate(b.check_out) },
        { label: 'Estadía', value: `${nightsLabel(b.nights)} · ${guestsLabel(b.guests)}` },
        { label: 'Pagado', value: formatCLP(b.amount_paid || b.total), strong: true },
      ],
      { title: 'Reserva' },
    ) +
    details(guestContactRows(b), { title: 'Huésped' }) +
    (b.notes ? notice(`<strong>Comentario del huésped:</strong><br>${esc(b.notes)}`) : '') +
    buttons(button(`${siteUrl}/admin/reservas`, 'Abrir en el panel', 'dark'), ...contactButtons(b, greeting))

  return {
    subject,
    preheader,
    html: layout({ title: subject, preheader, body, internal: true, footer: footer(ctx, 'Aviso automático del panel de reservas') }),
    text: text(
      `Nueva reserva pagada: ${b.code}`,
      '',
      `Cabaña: ${cabin.name}`,
      `Llegada: ${longDate(b.check_in)}`,
      `Salida: ${longDate(b.check_out)}`,
      `Estadía: ${nightsLabel(b.nights)} · ${guestsLabel(b.guests)}`,
      `Pagado: ${formatCLP(b.amount_paid || b.total)}`,
      '',
      `Huésped: ${b.guest_first_name} ${b.guest_last_name}`,
      `Teléfono: ${b.guest_phone}`,
      `Correo: ${b.guest_email}`,
      b.guest_document && `Documento: ${b.guest_document}`,
      b.arrival_window && `Llegada: ${b.arrival_window}`,
      b.notes && `Comentario: ${b.notes}`,
      '',
      `Panel: ${siteUrl}/admin/reservas`,
    ),
  }
}

export function ownerAbandoned(ctx: EmailContext): Email {
  const { booking: b, cabin, siteUrl } = ctx
  const subject = `Reserva sin pagar · ${b.guest_first_name} ${b.guest_last_name} · ${shortRange(b)}`
  const preheader = `Intentó reservar ${cabin.name} pero no completó el pago. Las fechas se liberaron.`
  const greeting = `Hola ${b.guest_first_name}, te escribimos de Altos de Cahuil. Vimos que intentaste reservar ${cabin.name} del ${formatDateShort(b.check_in)} al ${formatDateShort(b.check_out)}. ¿Te podemos ayudar a terminar la reserva?`

  const body =
    eyebrow('Reserva sin pagar', C.amberDark) +
    h1(`${b.guest_first_name} no terminó de pagar`) +
    p(`Empezó a reservar <strong>${esc(cabin.name)}</strong>, pero el pago no se completó y las fechas volvieron a quedar libres. Ya le enviamos un correo para que lo reintente; si quieres, contáctalo directamente.`) +
    details(
      [
        { label: 'Fechas', value: `${cap(formatDateShort(b.check_in))} – ${formatDateShort(b.check_out)}`, hint: nightsLabel(b.nights) },
        { label: 'Huéspedes', value: guestsLabel(b.guests) },
        { label: 'Total', value: formatCLP(b.total), strong: true },
      ],
      { title: 'Intento de reserva' },
    ) +
    details(guestContactRows(b), { title: 'Contacto' }) +
    buttons(...contactButtons(b, greeting), button(`${siteUrl}/admin/reservas?filtro=canceladas`, 'Ver en el panel', 'dark'))

  return {
    subject,
    preheader,
    html: layout({ title: subject, preheader, body, internal: true, footer: footer(ctx, 'Aviso automático del panel de reservas') }),
    text: text(
      `Reserva sin pagar (${b.code})`,
      '',
      `${b.guest_first_name} ${b.guest_last_name} intentó reservar ${cabin.name} del ${longDate(b.check_in)} al ${longDate(b.check_out)} por ${formatCLP(b.total)}, pero no pagó.`,
      `Teléfono: ${b.guest_phone}`,
      `Correo: ${b.guest_email}`,
      '',
      `Panel: ${siteUrl}/admin/reservas?filtro=canceladas`,
    ),
  }
}

export function ownerAlert(ctx: { siteUrl: string; settings: Settings }, title: string, message: string, booking?: Booking, cabin?: EmailCabin): Email {
  const subject = title
  const preheader = message
  const rows: Row[] = booking
    ? [
        { label: 'Código', value: booking.code },
        ...(cabin ? [{ label: 'Cabaña', value: cabin.name }] : []),
        { label: 'Fechas', value: `${cap(formatDateShort(booking.check_in))} – ${formatDateShort(booking.check_out)}` },
        { label: 'Huésped', value: `${booking.guest_first_name} ${booking.guest_last_name}` },
        ...(hasPhone(booking.guest_phone) ? [{ label: 'Teléfono', value: booking.guest_phone }] : []),
        { label: 'Total', value: formatCLP(booking.total) },
      ]
    : []

  const body =
    eyebrow('Requiere tu atención', C.red) +
    h1(title) +
    notice(esc(message), 'red') +
    (rows.length ? details(rows, { title: 'Reserva' }) : '') +
    buttons(button(`${ctx.siteUrl}/admin/reservas?filtro=alertas`, 'Revisar en el panel', 'dark'))

  return {
    subject,
    preheader,
    html: layout({ title: subject, preheader, body, internal: true, footer: footer(ctx, 'Aviso automático del panel de reservas') }),
    text: text(title, '', message, booking && `Reserva ${booking.code} · ${booking.guest_first_name} ${booking.guest_last_name}`, '', `Panel: ${ctx.siteUrl}/admin/reservas?filtro=alertas`),
  }
}

/** Renderiza cualquier plantilla por id (lo usa la vista previa del panel). */
export function renderTemplate(id: TemplateId, ctx: EmailContext, today: string): Email {
  switch (id) {
    case 'guest-confirmed':
      return guestConfirmed(ctx)
    case 'guest-reminder':
      return guestReminder(ctx, today)
    case 'guest-thanks':
      return guestThanks(ctx)
    case 'guest-abandoned':
      return guestAbandoned(ctx)
    case 'guest-cancelled':
      return guestCancelled(ctx)
    case 'owner-new':
      return ownerNew(ctx)
    case 'owner-abandoned':
      return ownerAbandoned(ctx)
    case 'owner-alert':
      return ownerAlert(ctx, `Revisar pago de reserva ${ctx.booking.code}`, 'El monto pagado en Mercado Pago no coincide con el total de la reserva. Revisa el pago antes de confirmar.', ctx.booking, ctx.cabin)
  }
}
