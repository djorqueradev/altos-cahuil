import 'server-only'
import { cache } from 'react'
import { supabaseAdmin } from '@/lib/supabase/admin'

export type Settings = {
  check_in_from: string
  check_out_until: string
  cancellation_policy: string
  pets_policy: string
  house_rules: string
  payment_hold_minutes: number
  contact_phone: string
  contact_email: string
  whatsapp: string
  instagram: string
}

export const DEFAULT_SETTINGS: Settings = {
  check_in_from: '',
  check_out_until: '',
  cancellation_policy: '',
  pets_policy: '',
  house_rules: '',
  payment_hold_minutes: 30,
  contact_phone: '+56 9 8197 5916',
  contact_email: 'altos.cahuil@gmail.com',
  whatsapp: '56981975916',
  instagram: '',
}

/** Configuración del negocio editable desde el panel (una sola fila). */
export const getSettings = cache(async (): Promise<Settings> => {
  try {
    const { data } = await supabaseAdmin().from('settings').select('*').eq('id', 1).maybeSingle()
    return { ...DEFAULT_SETTINGS, ...(data ?? {}) } as Settings
  } catch {
    return DEFAULT_SETTINGS
  }
})

export function phoneHref(s: Settings) {
  return `tel:${s.contact_phone.replace(/[^\d+]/g, '')}`
}
export function whatsappHref(s: Settings, text?: string) {
  const n = s.whatsapp.replace(/\D/g, '')
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}
export function orConsult(v: string) {
  return v.trim() || 'Consúltanos'
}
