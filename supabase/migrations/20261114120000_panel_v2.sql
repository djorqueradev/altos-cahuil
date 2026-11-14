-- Panel v2: temporadas de precio, pagos y notas internas, configuración del negocio.

-- ---------------------------------------------------------------------------
-- Pagos y notas en reservas
-- ---------------------------------------------------------------------------
alter table public.bookings
  add column if not exists amount_paid int not null default 0 check (amount_paid >= 0),
  add column if not exists payment_method text,          -- mercadopago | transferencia | efectivo | otro
  add column if not exists internal_notes text;

-- Las reservas web ya pagadas quedan con su monto pagado
update public.bookings set amount_paid = total, payment_method = 'mercadopago'
 where status = 'confirmed' and source = 'direct' and amount_paid = 0;
update public.bookings set amount_paid = total
 where status = 'confirmed' and source = 'manual' and amount_paid = 0 and paid_at is not null;

-- ---------------------------------------------------------------------------
-- Temporadas / tarifas especiales (sobrescriben el precio base por noche)
-- ---------------------------------------------------------------------------
create table if not exists public.rates (
  id uuid primary key default gen_random_uuid(),
  cabin_id uuid references public.cabins(id) on delete cascade,  -- null = todas las cabañas
  label text not null default 'Temporada',
  start_date date not null,
  end_date date not null,            -- exclusivo (primera noche que ya no aplica)
  price_per_night int not null check (price_per_night > 0),
  min_nights int check (min_nights >= 1),
  created_at timestamptz not null default now(),
  constraint rates_dates_ok check (end_date > start_date)
);
create index if not exists rates_dates_idx on public.rates (start_date, end_date);
alter table public.rates enable row level security;

-- ---------------------------------------------------------------------------
-- Configuración del negocio (una sola fila)
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  check_in_from text not null default '',
  check_out_until text not null default '',
  cancellation_policy text not null default '',
  pets_policy text not null default '',
  house_rules text not null default '',
  payment_hold_minutes int not null default 30 check (payment_hold_minutes between 10 and 120),
  contact_phone text not null default '+56 9 8197 5916',
  contact_email text not null default 'altos.cahuil@gmail.com',
  whatsapp text not null default '56981975916',
  instagram text not null default '',
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;
alter table public.settings enable row level security;

-- ---------------------------------------------------------------------------
-- Cotización de una estadía (precio por noche según temporada + limpieza)
-- ---------------------------------------------------------------------------
create or replace function public.night_price(p_cabin uuid, p_date date)
returns int language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select r.price_per_night from public.rates r
      where (r.cabin_id = p_cabin or r.cabin_id is null)
        and p_date >= r.start_date and p_date < r.end_date
      order by (r.cabin_id is null), r.start_date desc
      limit 1),
    (select c.price_per_night from public.cabins c where c.id = p_cabin)
  )
$$;

create or replace function public.quote_stay(p_cabin uuid, p_check_in date, p_check_out date)
returns table (nights int, subtotal int, cleaning_fee int, total int, min_nights int, has_unpriced boolean)
language sql stable security definer set search_path = '' as $$
  with n as (
    select d::date as d, public.night_price(p_cabin, d::date) as price
      from generate_series(p_check_in, p_check_out - 1, interval '1 day') d
  ), c as (
    select * from public.cabins where id = p_cabin
  )
  select
    (p_check_out - p_check_in)::int,
    coalesce(sum(n.price), 0)::int,
    (select cleaning_fee from c),
    (coalesce(sum(n.price), 0) + (select cleaning_fee from c))::int,
    greatest(
      (select min_nights from c),
      coalesce((select max(r.min_nights) from public.rates r
                 where (r.cabin_id = p_cabin or r.cabin_id is null)
                   and r.start_date < p_check_out and r.end_date > p_check_in), 1)
    )::int,
    bool_or(coalesce(n.price, 0) <= 0)
  from n
$$;

revoke all on function public.night_price(uuid, date) from public, anon, authenticated;
revoke all on function public.quote_stay(uuid, date, date) from public, anon, authenticated;
grant execute on function public.night_price(uuid, date) to service_role;
grant execute on function public.quote_stay(uuid, date, date) to service_role;

-- ---------------------------------------------------------------------------
-- create_direct_booking: ahora con temporadas y minutos de espera configurables
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
  v_q record;
  v_hold int;
  v_booking public.bookings;
begin
  select * into v_cabin from public.cabins where slug = p_cabin_slug and active;
  if not found then raise exception 'CABIN_NOT_FOUND'; end if;

  if p_check_out - p_check_in < 1 then raise exception 'INVALID_DATES'; end if;
  if p_check_in < (now() at time zone 'America/Santiago')::date then raise exception 'PAST_DATES'; end if;
  if p_guests < 1 or p_guests > v_cabin.capacity then raise exception 'TOO_MANY_GUESTS:%', v_cabin.capacity; end if;

  select * into v_q from public.quote_stay(v_cabin.id, p_check_in, p_check_out);
  if v_q.has_unpriced then raise exception 'PRICE_NOT_SET'; end if;
  if v_q.nights < v_q.min_nights then raise exception 'MIN_NIGHTS:%', v_q.min_nights; end if;

  select coalesce((select payment_hold_minutes from public.settings where id = 1), p_hold_minutes) into v_hold;

  update public.bookings
     set status = 'expired'
   where cabin_id = v_cabin.id and status = 'pending' and expires_at <= now();

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
      round(v_q.subtotal::numeric / v_q.nights)::int, v_q.subtotal, v_q.cleaning_fee, v_q.total,
      'pending', 'direct', now() + make_interval(mins => v_hold)
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
