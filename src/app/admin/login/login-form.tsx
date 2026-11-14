'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/browser'

const input = 'fx-field min-h-[50px] rounded-[10px] border border-cream/20 bg-ink px-3.5 text-base text-cream'

export function LoginForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setLoading(true)
    setError(null)
    const { error } = await supabaseBrowser().auth.signInWithPassword({
      email: String(fd.get('email')),
      password: String(fd.get('password')),
    })
    if (error) {
      setError('Correo o contraseña incorrectos.')
      setLoading(false)
      return
    }
    router.replace('/admin')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm font-semibold">
        Correo
        <input name="email" type="email" required autoComplete="email" className={input} />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold">
        Contraseña
        <input name="password" type="password" required autoComplete="current-password" className={input} />
      </label>
      {error && <p role="alert" className="text-sm text-amber-light">{error}</p>}
      <button type="submit" disabled={loading} className="fx-btn mt-2 min-h-[52px] rounded-full bg-amber font-bold text-amber-ink">
        {loading ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  )
}
