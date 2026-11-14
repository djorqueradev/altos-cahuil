-- Altos de Cahuil — esquema inicial
-- Reservas directas (Mercado Pago), bloqueos manuales e importación iCal de Booking/Airbnb.

create extension if not exists btree_gist with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Cabañas
-- ---------------------------------------------------------------------------
create table public.cabins (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_description text not null default '',
  description text not null default '',
  capacity int not null default 4 check (capacity > 0),
  bedrooms_summary text not null default '',
  price_per_night int not null default 0 check (price_per_night >= 0),   -- CLP
  cleaning_fee int not null default 0 check (cleaning_fee >= 0),         -- CLP
  min_nights int not null default 1 check (min_nights >= 1),
  cover_image text not null default '/fotos/cabin_front.jpg',
  gallery text[] not null default '{}',
  amenities text[] not null default '{}',
  ical_export_token text not null default encode(extensions.gen_random_bytes(18), 'hex'),
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Reservas (directas, manuales). Las de Booking/Airbnb llegan como external_events.
-- ---------------------------------------------------------------------------
create type public.booking_status as enum ('pending', 'confirmed', 'cancelled', 'expired');
create type public.booking_source as enum ('direct', 'manual');

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('AC-' || upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 6))),
  cabin_id uuid not null references public.cabins(id) on delete restrict,
  check_in date not null,
  check_out date not null,
  guests int not null check (guests > 0),
  guest_first_name text not null,
  guest_last_name text not null,
  guest_email text not null,
  guest_phone text not null,
  guest_document text,
  arrival_window text,
  notes text,
  nights int generated always as (check_out - check_in) stored,
  price_per_night int not null,
  subtotal int not null,
  cleaning_fee int not null default 0,
  total int not null,
  status public.booking_status not null default 'pending',
  source public.booking_source not null default 'direct',
  expires_at timestamptz,                 -- solo para 'pending': se libera si no paga
  mp_order_id text,                       -- id de la order de Mercado Pago (API de Orders)
  mp_payment_id text,
  paid_at timestamptz,
  admin_alert text,                       -- p.ej. pago recibido pero fechas ya tomadas
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_dates_ok check (check_out > check_in)
);

-- Nunca dos reservas (pendientes o confirmadas) que se crucen en la misma cabaña.
-- Las pendientes vencidas se marcan 'expired' dentro de create_direct_booking antes de insertar.
alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (
    cabin_id with =,
    daterange(check_in, check_out, '[)') with &&
  ) where (status in ('pending', 'confirmed'));

create index bookings_cabin_dates_idx on public.bookings (cabin_id, check_in, check_out);
create index bookings_status_idx on public.bookings (status);

-- ---------------------------------------------------------------------------
-- Bloqueos manuales (mantención, uso propio, etc.)
-- ---------------------------------------------------------------------------
create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  cabin_id uuid not null references public.cabins(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text not null default 'Bloqueado',
  created_at timestamptz not null default now(),
  constraint blocks_dates_ok check (end_date > start_date)
);
create index blocks_cabin_dates_idx on public.blocks (cabin_id, start_date, end_date);

-- ---------------------------------------------------------------------------
-- Canales externos (iCal) y sus eventos importados
-- ---------------------------------------------------------------------------
create type public.channel as enum ('booking', 'airbnb');

create table public.channel_feeds (
  id uuid primary key default gen_random_uuid(),
  cabin_id uuid not null references public.cabins(id) on delete cascade,
  channel public.channel not null,
  ical_url text not null,
  last_synced_at timestamptz,
  last_status text,
  last_event_count int,
  created_at timestamptz not null default now(),
  unique (cabin_id, channel)
);

create table public.external_events (
  id uuid primary key default gen_random_uuid(),
  feed_id uuid not null references public.channel_feeds(id) on delete cascade,
  cabin_id uuid not null references public.cabins(id) on delete cascade,
  channel public.channel not null,
  uid text not null,
  start_date date not null,
  end_date date not null,
  summary text,
  last_seen_at timestamptz not null default now(),
  unique (feed_id, uid)
);
create index external_events_cabin_dates_idx on public.external_events (cabin_id, start_date, end_date);

-- ---------------------------------------------------------------------------
-- Administradores (usuarios de Supabase Auth con acceso al panel)
-- ---------------------------------------------------------------------------
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger cabins_touch before update on public.cabins
  for each row execute function public.touch_updated_at();
create trigger bookings_touch before update on public.bookings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Ocupación: todos los rangos ocupados de una cabaña entre dos fechas.
-- Incluye reservas confirmadas, pendientes vigentes, bloqueos y eventos de canales.
-- ---------------------------------------------------------------------------
create or replace function public.cabin_busy_ranges(p_cabin uuid, p_from date, p_to date)
returns table (start_date date, end_date date, kind text)
language sql stable security definer set search_path = '' as $$
  select b.check_in, b.check_out, 'booking'
    from public.bookings b
   where b.cabin_id = p_cabin
     and (b.status = 'confirmed' or (b.status = 'pending' and b.expires_at > now()))
     and b.check_in < p_to and b.check_out > p_from
  union all
  select k.start_date, k.end_date, 'block'
    from public.blocks k
   where k.cabin_id = p_cabin and k.start_date < p_to and k.end_date > p_from
  union all
  select e.start_date, e.end_date, e.channel::text
    from public.external_events e
   where e.cabin_id = p_cabin and e.start_date < p_to and e.end_date > p_from
$$;

revoke all on function public.cabin_busy_ranges(uuid, date, date) from public, anon, authenticated;
grant execute on function public.cabin_busy_ranges(uuid, date, date) to service_role;

-- ---------------------------------------------------------------------------
-- Crear una reserva directa de forma atómica: valida reglas, calcula el precio
-- con los valores de la base y bloquea las fechas por p_hold_minutes mientras paga.
-- ---------------------------------------------------------------------------
create or replace function public.create_direct_booking(
  p_cabin_slug text,
  p_check_in date,
  p_check_out date,
  p_guests int,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_document text,
  p_arrival_window text,
  p_notes text,
  p_hold_minutes int default 30
) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  v_cabin public.cabins;
  v_nights int;
  v_booking public.bookings;
begin
  select * into v_cabin from public.cabins where slug = p_cabin_slug and active;
  if not found then raise exception 'CABIN_NOT_FOUND'; end if;

  v_nights := p_check_out - p_check_in;
  if v_nights < 1 then raise exception 'INVALID_DATES'; end if;
  if p_check_in < (now() at time zone 'America/Santiago')::date then raise exception 'PAST_DATES'; end if;
  if v_nights < v_cabin.min_nights then raise exception 'MIN_NIGHTS:%', v_cabin.min_nights; end if;
  if p_guests < 1 or p_guests > v_cabin.capacity then raise exception 'TOO_MANY_GUESTS:%', v_cabin.capacity; end if;
  if v_cabin.price_per_night <= 0 then raise exception 'PRICE_NOT_SET'; end if;

  -- Libera reservas pendientes que ya vencieron
  update public.bookings
     set status = 'expired'
   where cabin_id = v_cabin.id and status = 'pending' and expires_at <= now();

  -- Bloqueos manuales y canales externos
  if exists (
    select 1 from public.blocks k
     where k.cabin_id = v_cabin.id and k.start_date < p_check_out and k.end_date > p_check_in
    union all
    select 1 from public.external_events e
     where e.cabin_id = v_cabin.id and e.start_date < p_check_out and e.end_date > p_check_in
  ) then
    raise exception 'NOT_AVAILABLE';
  end if;

  begin
    insert into public.bookings (
      cabin_id, check_in, check_out, guests,
      guest_first_name, guest_last_name, guest_email, guest_phone, guest_document,
      arrival_window, notes,
      price_per_night, subtotal, cleaning_fee, total,
      status, source, expires_at
    ) values (
      v_cabin.id, p_check_in, p_check_out, p_guests,
      p_first_name, p_last_name, lower(p_email), p_phone, nullif(p_document, ''),
      nullif(p_arrival_window, ''), nullif(p_notes, ''),
      v_cabin.price_per_night, v_cabin.price_per_night * v_nights, v_cabin.cleaning_fee,
      v_cabin.price_per_night * v_nights + v_cabin.cleaning_fee,
      'pending', 'direct', now() + make_interval(mins => p_hold_minutes)
    ) returning * into v_booking;
  exception when exclusion_violation then
    raise exception 'NOT_AVAILABLE';
  end;

  return v_booking;
end $$;

revoke all on function public.create_direct_booking(text, date, date, int, text, text, text, text, text, text, text, int)
  from public, anon, authenticated;
grant execute on function public.create_direct_booking(text, date, date, int, text, text, text, text, text, text, text, int)
  to service_role;

-- ---------------------------------------------------------------------------
-- RLS: el sitio público solo lee cabañas activas. Todo lo demás pasa por el
-- servidor de Next.js con la service role key.
-- ---------------------------------------------------------------------------
alter table public.cabins enable row level security;
alter table public.bookings enable row level security;
alter table public.blocks enable row level security;
alter table public.channel_feeds enable row level security;
alter table public.external_events enable row level security;
alter table public.admins enable row level security;

create policy "cabañas activas visibles" on public.cabins
  for select to anon, authenticated using (active);

create policy "admin se ve a sí mismo" on public.admins
  for select to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Datos iniciales: las dos cabañas. Precios en 0 hasta que los configures en el panel.
-- ---------------------------------------------------------------------------
insert into public.cabins (slug, name, short_description, description, capacity, bedrooms_summary,
                           cover_image, gallery, amenities, sort_order)
values
  ('cabana-1', 'Cabaña 1',
   'Dormitorio matrimonial, camarote, cocina y terraza privada.',
   'Cabaña de madera elevada, con terraza propia orientada al campo costero. Living-comedor con cocina equipada, dormitorio matrimonial y camarote. Afuera, fogón con parrilla y mesa para comer al aire libre.',
   4, '1 dormitorio · camarote · 1 baño',
   '/fotos/cabin_front.jpg',
   array['/fotos/cabin_front.jpg','/fotos/living.jpg','/fotos/bedroom.jpg','/fotos/kitchen.jpg','/fotos/fire.jpg','/fotos/breakfast.jpg','/fotos/terrace.jpg'],
   array['Fogón y parrilla','Terraza privada','Cocina equipada','Living con TV','Ropa de cama','Estacionamiento gratis'],
   1),
  ('cabana-2', 'Cabaña 2',
   'Dormitorio matrimonial, camarote, cocina y terraza privada.',
   'Cabaña de madera elevada, con terraza propia orientada al campo costero. Living-comedor con cocina equipada, dormitorio matrimonial y camarote. Afuera, fogón con parrilla y mesa para comer al aire libre.',
   4, '1 dormitorio · camarote · 1 baño',
   '/fotos/cabin_side.jpg',
   array['/fotos/cabin_side.jpg','/fotos/living2.jpg','/fotos/bedroom.jpg','/fotos/kitchen.jpg','/fotos/fire.jpg','/fotos/coffee.jpg','/fotos/cabins_pano.jpg'],
   array['Fogón y parrilla','Terraza privada','Cocina equipada','Living con TV','Ropa de cama','Estacionamiento gratis'],
   2);
