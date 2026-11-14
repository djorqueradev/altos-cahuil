import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
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
