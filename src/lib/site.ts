// Datos fijos del negocio. Edita aquí lo que está entre corchetes.
export const site = {
  name: 'Altos de Cahuil',
  tagline: 'Cabañas · Pichilemu',
  address: 'Ruta Costera 952',
  locality: 'Cáhuil, Pichilemu',
  region: "Región de O'Higgins, Chile",
  directionsHint: 'Pasado Punta de Lobos, camino a Cáhuil.',
  phone: '+56 9 8197 5916',
  phoneHref: 'tel:+56981975916',
  whatsappHref: 'https://wa.me/56981975916',
  email: 'altos.cahuil@gmail.com',
  instagramHref: '', // ej: 'https://instagram.com/altosdecahuil'
  mapsHref: 'https://www.google.com/maps/search/?api=1&query=Ruta+Costera+952+Cahuil+Pichilemu',
  wazeHref: 'https://waze.com/ul?q=Ruta%20Costera%20952%20Cahuil%20Pichilemu',
  checkInFrom: '[HH:MM]',
  checkOutUntil: '[HH:MM]',
  cancellationPolicy: '[Tu política de cancelación]',
  petsPolicy: '[Sí / No]',
  nearby: [
    { name: 'Punta de Lobos', distance: '≈ 6 km' },
    { name: 'Laguna de Cáhuil', distance: '[distancia]' },
    { name: 'Centro de Pichilemu', distance: '[distancia]' },
  ],
  timeZone: 'America/Santiago',
  // Minutos que se reservan las fechas mientras el huésped paga en Mercado Pago
  paymentHoldMinutes: 30,
} as const
