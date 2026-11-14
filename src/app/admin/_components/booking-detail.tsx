'use client'

import { useState } from 'react'
import { IconCalendar, IconChat, IconMail } from '@/components/icons'
import { formatDate } from '@/lib/dates'
import { formatCLP } from '@/lib/money'
import { cancelBookingAction, clearAlertAction, resendConfirmationAction, setPaymentAction, updateBookingAction } from '../actions'
import { useAdmin } from './admin-provider'
import { Drawer } from './drawer'
import { Segmented } from './new-booking-form'
import { PAYMENT_METHODS, STATUS, paymentState, type AdminBooking } from './model'
import { Badge, cls } from './ui'

const toInt = (v: string) => Math.max(0, Math.round(Number(v.replace(/[^\d]/g, '')) || 0))
const clean = (v: string | null | undefined) => (v && v !== '-' ? v : '')

function waLink(phone: string, text: string) {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 8) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

export function BookingDetail({ booking: b, onClose }: { booking: AdminBooking; onClose: () => void }) {
  const { run } = useAdmin()
  const [notes, setNotes] = useState(b.internal_notes ?? '')
  const [payMode, setPayMode] = useState(false)
  const [amount, setAmount] = useState(String(b.amount_paid || ''))
  const [method, setMethod] = useState(b.payment_method || 'transferencia')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    guest_first_name: b.guest_first_name,
    guest_last_name: clean(b.guest_last_name),
    guest_phone: clean(b.guest_phone),
    guest_email: clean(b.guest_email),
    guests: b.guests,
    total: String(b.total),
  })
  const [busy, setBusy] = useState(false)

  const st = STATUS[b.status]
  const pay = paymentState(b)
  const balance = Math.max(0, b.total - b.amount_paid)
  const active = b.status === 'confirmed' || b.status === 'pending'
  const name = `${b.guest_first_name} ${clean(b.guest_last_name)}`.trim()
  const phone = clean(b.guest_phone)
  const email = clean(b.guest_email)
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const wa = phone ? waLink(phone, `Hola ${b.guest_first_name}, te escribimos de Altos de Cahuil por tu reserva ${b.code} (${formatDate(b.check_in)} → ${formatDate(b.check_out)}).`) : null

  async function act<T extends { ok: boolean }>(fn: () => Promise<T>, closeAfter = false) {
    setBusy(true)
    const r = await run(fn as never)
    setBusy(false)
    if ((r as T).ok && closeAfter) onClose()
    return r as T
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={name}
      subtitle={
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-amber">{b.code}</span>
          <Badge tone={st.tone}>{st.label}</Badge>
          {active && <Badge tone={pay.tone}>{pay.label}</Badge>}
          <span>{b.source === 'manual' ? 'Reserva manual' : 'Reserva web'}</span>
        </span>
      }
    >
      <div className="flex flex-col gap-6">
        {b.admin_alert && (
          <div role="alert" className="flex flex-col gap-2 rounded-xl border border-amber/40 bg-amber/10 p-3.5 text-sm text-amber-light">
            <p>⚠ {b.admin_alert}</p>
            <button type="button" disabled={busy} onClick={() => act(() => clearAlertAction(b.id))} className={`${cls.ghostSm} self-start`}>Marcar resuelta</button>
          </div>
        )}

        {/* Estadía */}
        <section className="grid grid-cols-2 gap-3 rounded-2xl bg-ink p-4 text-sm">
          <div className="col-span-2 flex items-center gap-2 text-[15px] font-semibold">
            <IconCalendar size={18} className="text-amber" /> {b.cabin_name}
          </div>
          <div><p className="text-xs text-muted">Llegada</p><p className="mt-0.5 font-semibold">{formatDate(b.check_in)}</p></div>
          <div><p className="text-xs text-muted">Salida</p><p className="mt-0.5 font-semibold">{formatDate(b.check_out)}</p></div>
          <div><p className="text-xs text-muted">Noches</p><p className="mt-0.5 font-semibold">{b.nights}</p></div>
          <div><p className="text-xs text-muted">Huéspedes</p><p className="mt-0.5 font-semibold">{b.guests}</p></div>
          {b.arrival_window && <div className="col-span-2"><p className="text-xs text-muted">Hora de llegada</p><p className="mt-0.5 font-semibold">{b.arrival_window}</p></div>}
        </section>

        {/* Contacto */}
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-[1.5px] text-muted">Contacto</h3>
          <div className="flex flex-wrap gap-2">
            {wa && <a href={wa} target="_blank" rel="noreferrer" className={cls.btnSm}><IconChat size={16} /> WhatsApp</a>}
            {phone && <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className={cls.ghostSm}>Llamar {phone}</a>}
            {email && <a href={`mailto:${email}`} className={cls.ghostSm}><IconMail size={14} /> {email}</a>}
            {!wa && !phone && !email && <p className="text-sm text-muted">Sin datos de contacto.</p>}
          </div>
          {b.guest_document && <p className="text-xs text-muted">RUT / pasaporte: {b.guest_document}</p>}
          {b.status === 'confirmed' && validEmail && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (window.confirm(`¿Enviar el correo de confirmación a ${email}?`)) act(() => resendConfirmationAction(b.id))
              }}
              className={`${cls.ghostSm} self-start`}
            >
              <IconMail size={14} /> {b.source === 'manual' ? 'Enviar confirmación por correo' : 'Reenviar confirmación por correo'}
            </button>
          )}
        </section>

        {/* Pago */}
        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-[1.5px] text-muted">Pago</h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-ink p-3"><p className="text-[11px] text-muted">Total</p><p className="mt-1 font-bold tabular-nums">{formatCLP(b.total)}</p></div>
            <div className="rounded-xl bg-ink p-3"><p className="text-[11px] text-muted">Pagado</p><p className="mt-1 font-bold tabular-nums text-[#A7E3BC]">{formatCLP(b.amount_paid)}</p></div>
            <div className="rounded-xl bg-ink p-3"><p className="text-[11px] text-muted">Saldo</p><p className={`mt-1 font-bold tabular-nums ${balance ? 'text-amber-light' : ''}`}>{formatCLP(balance)}</p></div>
          </div>
          {b.payment_method && <p className="text-xs text-muted">Medio: {PAYMENT_METHODS.find((m) => m.id === b.payment_method)?.label ?? b.payment_method}{b.mp_payment_id ? ` · Mercado Pago #${b.mp_payment_id}` : ''}</p>}
          {active && !payMode && (
            <div className="flex flex-wrap gap-2">
              {balance > 0 && (
                <button type="button" disabled={busy} onClick={() => act(() => setPaymentAction(b.id, b.total, b.payment_method || 'transferencia'))} className={cls.btnSm}>
                  Marcar pagada ({formatCLP(balance)})
                </button>
              )}
              <button type="button" onClick={() => setPayMode(true)} className={cls.ghostSm}>Registrar abono / corregir</button>
            </div>
          )}
          {payMode && (
            <div className="flex flex-col gap-3 rounded-xl border border-cream/10 p-3.5">
              <label className={cls.label}>
                Monto pagado en total (CLP)
                <input value={amount ? formatCLP(toInt(amount)).replace('$', '').trim() : ''} onChange={(e) => setAmount(String(toInt(e.target.value)))} inputMode="numeric" className={cls.input} />
              </label>
              <Segmented ariaLabel="Medio de pago" value={method} onChange={setMethod} options={PAYMENT_METHODS.map((m) => ({ id: m.id, label: m.label }))} />
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={async () => { const r = await act(() => setPaymentAction(b.id, toInt(amount), method)); if (r.ok) setPayMode(false) }} className={cls.btnSm}>Guardar pago</button>
                <button type="button" onClick={() => setPayMode(false)} className={cls.ghostSm}>Cancelar</button>
              </div>
            </div>
          )}
        </section>

        {/* Notas */}
        {b.notes && (
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-[1.5px] text-muted">Comentario del huésped</h3>
            <p className="rounded-xl bg-ink p-3.5 text-sm italic text-sub">“{b.notes}”</p>
          </section>
        )}
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-[1.5px] text-muted">Notas internas</h3>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Solo las ven ustedes" className={cls.textarea} />
          {notes !== (b.internal_notes ?? '') && (
            <button type="button" disabled={busy} onClick={() => act(() => updateBookingAction(b.id, { internal_notes: notes }))} className={`${cls.btnSm} self-start`}>Guardar nota</button>
          )}
        </section>

        {/* Editar */}
        {active && (
          <section className="flex flex-col gap-3">
            {!editing ? (
              <button type="button" onClick={() => setEditing(true)} className={`${cls.ghostSm} self-start`}>Editar datos del huésped o total</button>
            ) : (
              <div className="flex flex-col gap-3 rounded-xl border border-cream/10 p-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <label className={cls.label}>Nombre<input value={form.guest_first_name} onChange={(e) => setForm({ ...form, guest_first_name: e.target.value })} className={cls.input} /></label>
                  <label className={cls.label}>Apellido<input value={form.guest_last_name} onChange={(e) => setForm({ ...form, guest_last_name: e.target.value })} className={cls.input} /></label>
                  <label className={cls.label}>Teléfono<input value={form.guest_phone} onChange={(e) => setForm({ ...form, guest_phone: e.target.value })} className={cls.input} /></label>
                  <label className={cls.label}>Correo<input value={form.guest_email} onChange={(e) => setForm({ ...form, guest_email: e.target.value })} className={cls.input} /></label>
                  <label className={cls.label}>Huéspedes<input type="number" min={1} max={20} value={form.guests} onChange={(e) => setForm({ ...form, guests: Number(e.target.value) || 1 })} className={cls.input} /></label>
                  <label className={cls.label}>Total (CLP)<input value={formatCLP(toInt(form.total)).replace('$', '').trim()} onChange={(e) => setForm({ ...form, total: String(toInt(e.target.value)) })} inputMode="numeric" className={cls.input} disabled={b.source === 'direct'} /></label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      const r = await act(() =>
                        updateBookingAction(b.id, {
                          guest_first_name: form.guest_first_name,
                          guest_last_name: form.guest_last_name || '-',
                          guest_phone: form.guest_phone || '-',
                          guest_email: form.guest_email || '-',
                          guests: form.guests,
                          ...(b.source === 'manual' ? { total: toInt(form.total) } : {}),
                        }),
                      )
                      if (r.ok) setEditing(false)
                    }}
                    className={cls.btnSm}
                  >
                    Guardar cambios
                  </button>
                  <button type="button" onClick={() => setEditing(false)} className={cls.ghostSm}>Cancelar</button>
                </div>
                <p className="text-xs text-muted">Para cambiar fechas o cabaña: cancela esta reserva y crea una nueva.</p>
              </div>
            )}
          </section>
        )}

        {active && (
          <section className="border-t border-cream/[0.07] pt-5">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (window.confirm(`¿Cancelar la reserva ${b.code} de ${name}? Las fechas quedarán libres.${validEmail ? ` Le avisaremos por correo a ${email}.` : ''}${b.amount_paid ? ' Recuerda devolver el dinero si corresponde.' : ''}`)) act(() => cancelBookingAction(b.id), true)
              }}
              className={cls.danger}
            >
              Cancelar reserva
            </button>
          </section>
        )}
        <p className="text-xs text-muted">Creada el {new Date(b.created_at).toLocaleString('es-CL', { timeZone: 'America/Santiago', dateStyle: 'medium', timeStyle: 'short' })}</p>
      </div>
    </Drawer>
  )
}
