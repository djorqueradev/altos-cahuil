import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Rate } from '@/lib/pricing'
import type { BusyRange, Cabin, PublicCabin } from '@/lib/types'

const PUBLIC_COLS =
  'id, slug, name, short_description, description, capacity, bedrooms_summary, price_per_night, cleaning_fee, min_nights, cover_image, gallery, amenities'

export async function getCabins(): Promise<PublicCabin[]> {
  const { data, error } = await supabaseAdmin()
    .from('cabins')
    .select(PUBLIC_COLS)
    .eq('active', true)
    .order('sort_order')
  if (error) throw error
  return (data ?? []) as PublicCabin[]
}

export async function getCabin(slug: string): Promise<PublicCabin | null> {
  const { data, error } = await supabaseAdmin()
    .from('cabins')
    .select(PUBLIC_COLS)
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle()
  if (error) throw error
  return (data as PublicCabin) ?? null
}

export async function getAllCabinsAdmin(): Promise<Cabin[]> {
  const { data, error } = await supabaseAdmin().from('cabins').select('*').order('sort_order')
  if (error) throw error
  return (data ?? []) as Cabin[]
}

export async function getBusyRanges(cabinId: string, from: string, to: string): Promise<BusyRange[]> {
  const { data, error } = await supabaseAdmin().rpc('cabin_busy_ranges', {
    p_cabin: cabinId,
    p_from: from,
    p_to: to,
  })
  if (error) throw error
  return ((data ?? []) as { start_date: string; end_date: string; kind: string }[]).map((r) => ({
    start: r.start_date,
    end: r.end_date,
    kind: r.kind,
  }))
}

export async function isRangeFree(cabinId: string, checkIn: string, checkOut: string): Promise<boolean> {
  const busy = await getBusyRanges(cabinId, checkIn, checkOut)
  return busy.length === 0
}


/** Temporadas vigentes desde `from` (de una cabaña + las generales, o todas). */
export async function getRates(opts: { cabinId?: string; from?: string } = {}): Promise<Rate[]> {
  let q = supabaseAdmin()
    .from('rates')
    .select('id, cabin_id, label, start_date, end_date, price_per_night, min_nights')
    .order('start_date')
  if (opts.from) q = q.gt('end_date', opts.from)
  if (opts.cabinId) q = q.or(`cabin_id.eq.${opts.cabinId},cabin_id.is.null`)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as Rate[]
}

export type DbQuote = { nights: number; subtotal: number; cleaning_fee: number; total: number; min_nights: number; has_unpriced: boolean }

export async function getQuote(cabinId: string, checkIn: string, checkOut: string): Promise<DbQuote> {
  const { data, error } = await supabaseAdmin().rpc('quote_stay', { p_cabin: cabinId, p_check_in: checkIn, p_check_out: checkOut })
  if (error) throw error
  return (Array.isArray(data) ? data[0] : data) as DbQuote
}
