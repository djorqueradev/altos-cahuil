import 'server-only'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { supabaseServer } from '@/lib/supabase/server'

/** Exige un usuario autenticado que esté en la tabla `admins`. */
export async function requireAdmin() {
  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const { data } = await supabaseAdmin().from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
  if (!data) redirect('/admin/login?error=sin-acceso')
  return user
}
