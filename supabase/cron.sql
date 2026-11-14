-- Sincronización frecuente con Booking/Airbnb (cada 15 minutos) usando pg_cron + pg_net de Supabase.
-- Ejecutar UNA vez en el SQL Editor de Supabase, DESPUÉS de publicar el sitio.
-- Reemplaza <TU_DOMINIO> y <CRON_SECRET> (el mismo valor de la variable CRON_SECRET en Vercel).

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'altos-cahuil-sync-canales',
  '*/15 * * * *',
  $$
  select net.http_get(
    url := 'https://<TU_DOMINIO>/api/cron/sync',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
  );
  $$
);

-- Para quitarla:  select cron.unschedule('altos-cahuil-sync-canales');
