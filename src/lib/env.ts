import 'server-only'

function required(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Falta la variable de entorno ${name}`)
  return v
}

export const env = {
  supabaseUrl: () => required('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: () => required('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceKey: () => required('SUPABASE_SERVICE_ROLE_KEY'),
  siteUrl: () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  mpAccessToken: () => required('MP_ACCESS_TOKEN'),
  mpWebhookSecret: () => process.env.MP_WEBHOOK_SECRET || '',
  cronSecret: () => process.env.CRON_SECRET || '',
  resendApiKey: () => process.env.RESEND_API_KEY || '',
  emailFrom: () => process.env.EMAIL_FROM || 'Altos de Cahuil <reservas@altosdecahuil.cl>',
  ownerEmail: () => process.env.OWNER_EMAIL || '',
}
