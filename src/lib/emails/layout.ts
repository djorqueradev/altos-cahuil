// Piezas HTML para correos. Todo con tablas y estilos en línea para que se vea bien
// en Gmail, Outlook, Apple Mail y celulares. Paleta tomada del sitio (estilo "Atardecer").

export const C = {
  page: '#EFE7DC',
  paper: '#FFFCF7',
  ink: '#12100E',
  text: '#2A2119',
  sub: '#6F6458',
  muted: '#9A8E80',
  line: '#E8DED1',
  soft: '#F6EFE4',
  amber: '#E9A96B',
  amberDark: '#A8642C',
  amberInk: '#2A1A0A',
  cream: '#F4EBDD',
  red: '#B4483E',
  redSoft: '#FBEAE7',
  green: '#2F7A4C',
  greenSoft: '#E6F3EA',
}

const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif"
const SANS = "Manrope, 'Helvetica Neue', Helvetica, Arial, sans-serif"

export const esc = (s: string | number | null | undefined) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Texto con saltos de línea → <br>. */
export const nl2br = (s: string) => esc(s).replace(/\r?\n/g, '<br>')

export function eyebrow(text: string, color = C.amberDark) {
  return `<p style="margin:0 0 10px;font-family:${SANS};font-size:12px;line-height:16px;font-weight:700;letter-spacing:2.2px;text-transform:uppercase;color:${color}">${esc(text)}</p>`
}

export function h1(text: string) {
  return `<h1 class="h1" style="margin:0 0 16px;font-family:${SERIF};font-size:38px;line-height:42px;font-weight:500;color:${C.ink}">${esc(text)}</h1>`
}

export function h2(text: string) {
  return `<h2 style="margin:0 0 10px;font-family:${SERIF};font-size:24px;line-height:28px;font-weight:600;color:${C.ink}">${esc(text)}</h2>`
}

/** Párrafo. Recibe HTML ya escapado. */
export function p(html: string, opts: { size?: number; color?: string; mb?: number } = {}) {
  const size = opts.size ?? 16
  return `<p style="margin:0 0 ${opts.mb ?? 16}px;font-family:${SANS};font-size:${size}px;line-height:${Math.round(size * 1.6)}px;color:${opts.color ?? C.text}">${html}</p>`
}

export function spacer(h = 24) {
  return `<div style="height:${h}px;line-height:${h}px;font-size:1px">&nbsp;</div>`
}

export function divider(m = 28) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:${m}px 0"><tr><td style="border-top:1px solid ${C.line};font-size:0;line-height:0">&nbsp;</td></tr></table>`
}

type BtnVariant = 'primary' | 'secondary' | 'dark'

/** Botón "a prueba de balas" (funciona en Outlook). */
export function button(href: string, label: string, variant: BtnVariant = 'primary') {
  const bg = variant === 'primary' ? C.amber : variant === 'dark' ? C.ink : C.paper
  const fg = variant === 'primary' ? C.amberInk : variant === 'dark' ? C.cream : C.ink
  const border = variant === 'secondary' ? `1px solid ${C.ink}` : `1px solid ${bg}`
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;margin:0 8px 10px 0"><tr><td style="border-radius:999px;background:${bg};border:${border}">
    <a href="${esc(href)}" target="_blank" style="display:inline-block;padding:13px 24px;font-family:${SANS};font-size:15px;line-height:18px;font-weight:700;color:${fg};text-decoration:none;border-radius:999px">${esc(label)}</a>
  </td></tr></table>`
}

export function buttons(...items: string[]) {
  return `<div style="margin:8px 0 6px">${items.join('')}</div>`
}

export type Row = { label: string; value: string; strong?: boolean; html?: boolean; hint?: string }

/** Tarjeta con filas etiqueta / valor (detalle de la reserva, montos…). */
export function details(rows: Row[], opts: { title?: string; bg?: string } = {}) {
  const tr = rows
    .map((r, i) => {
      const border = i === 0 ? '' : `border-top:1px solid ${C.line};`
      const value = r.html ? r.value : esc(r.value)
      const hint = r.hint ? `<br><span style="font-weight:400;font-size:13px;color:${C.sub}">${esc(r.hint)}</span>` : ''
      return `<tr>
        <td valign="top" style="${border}padding:12px 0;font-family:${SANS};font-size:14px;line-height:20px;color:${C.sub};width:42%">${esc(r.label)}</td>
        <td valign="top" align="right" style="${border}padding:12px 0;font-family:${SANS};font-size:${r.strong ? 17 : 15}px;line-height:21px;font-weight:${r.strong ? 800 : 600};color:${C.ink}">${value}${hint}</td>
      </tr>`
    })
    .join('')
  const title = opts.title
    ? `<tr><td colspan="2" style="padding:0 0 4px;font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:${C.muted}">${esc(opts.title)}</td></tr>`
    : ''
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${opts.bg ?? C.soft};border-radius:16px;margin:0 0 20px">
    <tr><td style="padding:16px 22px 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${title}${tr}</table></td></tr>
  </table>`
}

/** Código de reserva destacado. */
export function codePill(code: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px"><tr>
    <td style="padding:8px 14px;border:1px dashed ${C.amberDark};border-radius:10px;font-family:${SANS};font-size:13px;color:${C.sub}">
      Código de reserva&nbsp; <strong style="font-size:16px;letter-spacing:1.5px;color:${C.ink}">${esc(code)}</strong>
    </td></tr></table>`
}

/** Bloque de aviso (verde, ámbar o rojo). */
export function notice(html: string, tone: 'green' | 'amber' | 'red' = 'amber') {
  const bg = tone === 'green' ? C.greenSoft : tone === 'red' ? C.redSoft : '#FCF1E4'
  const bar = tone === 'green' ? C.green : tone === 'red' ? C.red : C.amberDark
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px"><tr>
    <td style="background:${bg};border-left:4px solid ${bar};border-radius:10px;padding:14px 18px;font-family:${SANS};font-size:15px;line-height:23px;color:${C.text}">${html}</td>
  </tr></table>`
}

/** Lista de puntos con título en negrita (políticas, consejos…). */
export function infoList(items: { title: string; text: string }[]) {
  const li = items
    .filter((i) => i.text.trim())
    .map(
      (i) => `<tr>
        <td valign="top" style="padding:0 12px 14px 0;width:8px"><div style="width:7px;height:7px;margin-top:8px;border-radius:7px;background:${C.amber}"></div></td>
        <td valign="top" style="padding:0 0 14px;font-family:${SANS};font-size:15px;line-height:23px;color:${C.text}"><strong style="color:${C.ink}">${esc(i.title)}.</strong> ${nl2br(i.text)}</td>
      </tr>`,
    )
    .join('')
  return li ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px">${li}</table>` : ''
}

export type FooterInfo = {
  siteUrl: string
  address: string
  phone: string
  email: string
  whatsappUrl: string
  instagramUrl?: string
  reason: string
}

type LayoutOpts = {
  title: string
  preheader: string
  body: string
  hero?: { src: string; alt: string }
  footer: FooterInfo
  /** Correos internos para el dueño: cabecera más compacta. */
  internal?: boolean
}

/** Documento completo del correo. */
export function layout(o: LayoutOpts) {
  const f = o.footer
  const hero = o.hero
    ? `<tr><td style="padding:0;line-height:0;font-size:0"><img src="${esc(o.hero.src)}" width="600" alt="${esc(o.hero.alt)}" style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none"></td></tr>`
    : ''
  const links = [
    `<a href="${esc(f.whatsappUrl)}" style="color:${C.cream};text-decoration:none">WhatsApp</a>`,
    `<a href="tel:${esc(f.phone.replace(/[^\d+]/g, ''))}" style="color:${C.cream};text-decoration:none;white-space:nowrap">${esc(f.phone)}</a>`,
    `<a href="mailto:${esc(f.email)}" style="color:${C.cream};text-decoration:none">${esc(f.email)}</a>`,
    f.instagramUrl ? `<a href="${esc(f.instagramUrl)}" style="color:${C.cream};text-decoration:none">Instagram</a>` : '',
  ]
    .filter(Boolean)
    .join(`&nbsp;&nbsp;·&nbsp;&nbsp;`)

  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(o.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
  img{-ms-interpolation-mode:bicubic}
  a{color:${C.amberDark}}
  @media (max-width:620px){
    .container{width:100%!important}
    .px{padding-left:22px!important;padding-right:22px!important}
    .h1{font-size:31px!important;line-height:36px!important}
    .tagline{display:none!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.page}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.page};font-size:1px;line-height:1px">${esc(o.preheader)}${'&nbsp;&zwnj;'.repeat(60)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page}">
  <tr><td align="center" style="padding:28px 12px">
    <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;border-radius:20px;overflow:hidden;background:${C.paper}">
      <tr><td class="px" style="background:${C.ink};padding:${o.internal ? '20px 40px' : '28px 40px'}">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="font-family:${SERIF};font-size:${o.internal ? 22 : 27}px;line-height:30px;font-weight:500;color:${C.cream};white-space:nowrap">
            <a href="${esc(f.siteUrl)}" style="color:${C.cream};text-decoration:none">Altos de Cahuil</a>
          </td>
          <td align="right" class="tagline" style="font-family:${SANS};font-size:10px;line-height:14px;font-weight:700;letter-spacing:2.6px;text-transform:uppercase;color:${C.amber}">${o.internal ? 'Panel' : 'Cabañas · Pichilemu'}</td>
        </tr></table>
      </td></tr>
      ${hero}
      <tr><td class="px" style="padding:40px 40px 28px">${o.body}</td></tr>
      <tr><td class="px" style="background:${C.ink};padding:28px 40px;font-family:${SANS};font-size:13px;line-height:21px;color:#B7AB9C">
        <p style="margin:0 0 6px;font-family:${SERIF};font-size:19px;line-height:24px;color:${C.cream}">Altos de Cahuil</p>
        <p style="margin:0 0 12px">${esc(f.address)}</p>
        <p style="margin:0 0 16px">${links}</p>
        <p style="margin:0;font-size:12px;line-height:18px;color:#8C8072">${esc(f.reason)} · <a href="${esc(f.siteUrl)}" style="color:#B7AB9C">${esc(f.siteUrl.replace(/^https?:\/\//, ''))}</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}
