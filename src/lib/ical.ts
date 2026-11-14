// Lectura y escritura mínima de iCalendar (RFC 5545), suficiente para Booking.com y Airbnb.

export type ICalEvent = { uid: string; start: string; end: string; summary: string }

function unfold(text: string): string[] {
  return text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/)
}

function toISODate(value: string): string | null {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null
}

function addOneDay(d: string): string {
  const x = new Date(d + 'T00:00:00Z')
  x.setUTCDate(x.getUTCDate() + 1)
  return x.toISOString().slice(0, 10)
}

function unescapeText(v: string) {
  return v.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1')
}

export function parseICS(text: string): ICalEvent[] {
  const events: ICalEvent[] = []
  let cur: Partial<ICalEvent> | null = null
  for (const line of unfold(text)) {
    if (line === 'BEGIN:VEVENT') {
      cur = {}
      continue
    }
    if (line === 'END:VEVENT') {
      if (cur?.start) {
        const end = cur.end && cur.end > cur.start ? cur.end : addOneDay(cur.start)
        events.push({
          uid: cur.uid || `${cur.start}-${end}-${events.length}`,
          start: cur.start,
          end,
          summary: cur.summary || '',
        })
      }
      cur = null
      continue
    }
    if (!cur) continue
    const idx = line.indexOf(':')
    if (idx < 0) continue
    const name = line.slice(0, idx).split(';')[0].toUpperCase()
    const value = line.slice(idx + 1).trim()
    if (name === 'UID') cur.uid = value
    else if (name === 'DTSTART') cur.start = toISODate(value) ?? undefined
    else if (name === 'DTEND') cur.end = toISODate(value) ?? undefined
    else if (name === 'SUMMARY') cur.summary = unescapeText(value)
  }
  return events
}

function fold(line: string): string {
  const out: string[] = []
  let rest = line
  while (rest.length > 74) {
    out.push(rest.slice(0, 74))
    rest = ' ' + rest.slice(74)
  }
  out.push(rest)
  return out.join('\r\n')
}

const icsDate = (d: string) => d.replace(/-/g, '')

export function buildICS(name: string, events: ICalEvent[]): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Altos de Cahuil//Reservas//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${name}`,
    ...events.flatMap((e) => [
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(e.start)}`,
      `DTEND;VALUE=DATE:${icsDate(e.end)}`,
      `SUMMARY:${e.summary.replace(/([,;\\])/g, '\\$1')}`,
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
  ]
  return lines.map(fold).join('\r\n') + '\r\n'
}
