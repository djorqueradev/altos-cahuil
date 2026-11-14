'use client'

import { useMemo, useState } from 'react'
import { formatDate } from '@/lib/dates'
import { formatCLP } from '@/lib/money'
import { useAdmin } from './admin-provider'
import { STATUS, paymentState, type AdminBooking } from './model'
import { Badge, cls } from './ui'

function norm(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function BookingsTable({ bookings }: { bookings: AdminBooking[] }) {
  const { openBooking } = useAdmin()
  const [q, setQ] = useState('')

  const rows = useMemo(() => {
    const t = norm(q.trim())
    if (!t) return bookings
    return bookings.filter((b) =>
      norm([b.code, b.guest_first_name, b.guest_last_name, b.guest_email, b.guest_phone, b.cabin_name].join(' ')).includes(t),
    )
  }, [bookings, q])

  const totals = rows.reduce(
    (a, b) => (b.status === 'confirmed' ? { total: a.total + b.total, paid: a.paid + b.amount_paid } : a),
    { total: 0, paid: 0 },
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, código, teléfono o correo…"
          aria-label="Buscar reservas"
          className={`${cls.input} max-w-[420px] flex-1`}
        />
        <p className="text-[13px] text-muted">
          {rows.length} {rows.length === 1 ? 'reserva' : 'reservas'}
          {totals.total > 0 && <> · total {formatCLP(totals.total)} · cobrado {formatCLP(totals.paid)}</>}
        </p>
      </div>

      {/* Tabla (escritorio) */}
      <div className="hidden overflow-hidden rounded-2xl border border-cream/[0.06] bg-surface md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-cream/[0.06] text-left text-[11px] uppercase tracking-[1.2px] text-muted">
              <th className="px-4 py-3 font-semibold">Huésped</th>
              <th className="px-4 py-3 font-semibold">Cabaña</th>
              <th className="px-4 py-3 font-semibold">Fechas</th>
              <th className="px-4 py-3 text-right font-semibold">Total</th>
              <th className="px-4 py-3 font-semibold">Pago</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => {
              const st = STATUS[b.status]
              const p = paymentState(b)
              return (
                <tr key={b.id} onClick={() => openBooking(b)} className="fx-row cursor-pointer border-b border-cream/[0.04] last:border-b-0">
                  <td className="px-4 py-3">
                    <button type="button" onClick={(e) => { e.stopPropagation(); openBooking(b) }} className="text-left">
                      <span className="block font-semibold">{b.guest_first_name} {b.guest_last_name !== '-' ? b.guest_last_name : ''}</span>
                      <span className="block text-xs text-muted">{b.code} · {b.source === 'manual' ? 'Manual' : 'Web'}{b.admin_alert ? ' · ⚠ alerta' : ''}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3">{b.cabin_name}</td>
                  <td className="px-4 py-3">
                    <span className="block">{formatDate(b.check_in)} → {formatDate(b.check_out)}</span>
                    <span className="block text-xs text-muted">{b.nights} noches · {b.guests} pers.</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCLP(b.total)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={p.tone}>{p.label}</Badge>
                    {p.label === 'Abono' && <span className="ml-2 text-xs text-muted">saldo {formatCLP(b.total - b.amount_paid)}</span>}
                  </td>
                  <td className="px-4 py-3"><Badge tone={st.tone}>{st.label}</Badge></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="py-10 text-center text-sm text-muted">No hay reservas que coincidan.</p>}
      </div>

      {/* Tarjetas (celular) */}
      <ul className="flex flex-col gap-2 md:hidden">
        {rows.map((b) => {
          const st = STATUS[b.status]
          const p = paymentState(b)
          return (
            <li key={b.id}>
              <button type="button" onClick={() => openBooking(b)} className="flex w-full flex-col gap-2 rounded-2xl border border-cream/[0.06] bg-surface p-4 text-left">
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{b.guest_first_name} {b.guest_last_name !== '-' ? b.guest_last_name : ''}</span>
                    <span className="block text-xs text-muted">{b.code} · {b.cabin_name}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{formatCLP(b.total)}</span>
                </span>
                <span className="text-sm text-sub">{formatDate(b.check_in)} → {formatDate(b.check_out)} · {b.nights} noches</span>
                <span className="flex flex-wrap gap-1.5"><Badge tone={st.tone}>{st.label}</Badge>{b.status === 'confirmed' && <Badge tone={p.tone}>{p.label}</Badge>}</span>
              </button>
            </li>
          )
        })}
        {rows.length === 0 && <p className="py-10 text-center text-sm text-muted">No hay reservas que coincidan.</p>}
      </ul>
    </div>
  )
}
