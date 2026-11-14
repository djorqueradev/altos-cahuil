import type { Metadata } from 'next'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Ingresar al panel', robots: { index: false } }

export default async function LoginPage(props: PageProps<'/admin/login'>) {
  const sp = await props.searchParams
  return (
    <main className="flex min-h-dvh items-center justify-center px-5">
      <div className="fx-up w-full max-w-[420px] rounded-2xl border border-line bg-surface p-8">
        <p className="font-display text-[30px] font-semibold leading-none">Altos de Cahuil</p>
        <p className="mt-2 text-[11px] uppercase tracking-[3px] text-muted">Administración</p>
        {sp.error === 'sin-acceso' && (
          <p role="alert" className="mt-6 rounded-xl border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber-light">
            Esta cuenta no tiene acceso al panel.
          </p>
        )}
        <LoginForm />
      </div>
    </main>
  )
}
