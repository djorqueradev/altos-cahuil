// Textos derivados de la configuración (sin acceso a la base, se puede usar en cualquier lado).
type Hours = { check_in_from: string; check_in_until?: string; check_out_until: string }

/** "Entre las 14:00 y las 20:00", "Desde las 14:00" o '' si no está configurado. */
export function checkInText(s: Hours) {
  const from = s.check_in_from.trim()
  const until = (s.check_in_until ?? '').trim()
  if (from && until) return `Entre las ${from} y las ${until}`
  if (from) return `Desde las ${from}`
  if (until) return `Hasta las ${until}`
  return ''
}

/** "Hasta las 12:00" o ''. */
export function checkOutText(s: Hours) {
  const v = s.check_out_until.trim()
  return v ? `Hasta las ${v}` : ''
}
