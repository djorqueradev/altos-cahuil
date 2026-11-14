# Altos de Cahuil — sitio web y reservas

Sitio de las cabañas Altos de Cahuil (Cáhuil, Pichilemu): web pública, reservas con pago en **Mercado Pago** (Checkout Pro, API de Orders),
sincronización de calendarios con **Booking.com** y **Airbnb** (iCal) y panel de administración.

**Stack:** Next.js 16 (App Router) · Tailwind 4 · Supabase (Postgres + Auth) · Mercado Pago Checkout Pro (API de Orders) · Resend (correos, opcional).

## Cómo funciona

| Parte | Dónde |
| --- | --- |
| Inicio, ficha de cabaña con calendario, reserva, confirmación | `src/app/(site)` |
| Crear reserva + preferencia de pago | `POST /api/bookings` |
| Confirmación del pago (webhook) | `POST /api/mercadopago/webhook` |
| Calendario que se exporta a Booking/Airbnb | `GET /api/ical/[cabaña]?token=…&exclude=booking` |
| Importar Booking/Airbnb + liberar pagos vencidos | `GET /api/cron/sync` (con `Authorization: Bearer CRON_SECRET`) |
| Panel: Hoy, calendario mensual, reservas, tarifas y temporadas, Booking/Airbnb, configuración | `/admin` |
| Esquema de base de datos | `supabase/migrations/` |

- Al reservar, las fechas quedan apartadas 30 min (`pending`) mientras el huésped paga. Una restricción de exclusión en Postgres
  impide que dos reservas se crucen; antes de crear una se refrescan los calendarios de Booking/Airbnb de esa cabaña.
- El pago se confirma por el webhook y también cuando el huésped vuelve desde Mercado Pago (lo que llegue primero).
- Si un pago llega tarde y las fechas ya se ocuparon, la reserva queda con una **alerta** en el panel para reembolsar.

## Puesta en marcha

1. **Supabase**: en el SQL Editor ejecuta, en orden, los archivos de `supabase/migrations/`.
2. **Usuario administrador**: Authentication → Users → *Add user* (correo + contraseña). Luego en el SQL Editor:
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'TU_CORREO';
   ```
3. **Variables de entorno**: copia `.env.example` a `.env.local` y complétalo.
4. `npm install` y `npm run dev` → http://localhost:3000 (panel en `/admin`).
5. En el panel → **Cabañas y tarifas**: pon precio por noche, limpieza, capacidad y noches mínimas.

## Publicar en Vercel

1. Importa este repo en Vercel y agrega las variables de `.env.example` (con `NEXT_PUBLIC_SITE_URL` = tu dominio).
2. **Mercado Pago** → Tus integraciones → tu aplicación (Checkout Pro, *API de Orders*) → **Configuración de Webhooks**:
   URL `https://TU_DOMINIO/api/mercadopago/webhook`, evento **Order (Mercado Pago)**. Copia la *clave secreta* en `MP_WEBHOOK_SECRET`.
   Para pruebas usa el Access Token de *Credenciales de prueba*; para cobrar de verdad, el de *Producción*.
3. **Sincronización frecuente**: `vercel.json` corre `/api/cron/sync` una vez al día (límite del plan Hobby). Para cada
   15 minutos ejecuta `supabase/cron.sql` en Supabase (usa pg_cron) después de publicar.
4. **Booking/Airbnb**: en el panel → *Booking / Airbnb*, pega el enlace iCal que exporta cada canal y copia nuestro enlace
   en la opción *Importar calendario* de cada canal.

## Configuración del negocio

Horarios, políticas, contacto, precios, temporadas y textos de cada cabaña se editan desde el panel (`/admin/configuracion` y `/admin/tarifas`).
