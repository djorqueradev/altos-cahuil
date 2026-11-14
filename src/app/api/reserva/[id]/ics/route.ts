import { buildICS } from '@/lib/ical'
import { site } from '@/lib/site'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Archivo .ics para que el huésped agregue su estadía al calendario.
export async function GET(_req: Request, ctx: RouteContext<'/api/reserva/[id]/ics'>) {
  const { id } = await ctx.params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response('No encontrado', { status: 404 })
  const { data } = await supabaseAdmin()
    .from('bookings')
    .select('code, check_in, check_out, status, cabins(name)')
    .eq('id', id)
    .maybeSingle()
  if (!data || data.status !== 'confirmed') return new Response('No encontrado', { status: 404 })
  const cabin = (data.cabins as unknown as { name: string } | null)?.name ?? 'Cabaña'
  const ics = buildICS(site.name, [
    {
      uid: `${data.code}@altosdecahuil`,
      start: data.check_in,
      end: data.check_out,
      summary: `${site.name} · ${cabin} (${site.address}, ${site.locality})`,
    },
  ])
  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="reserva-${data.code}.ics"`,
    },
  })
}
