-- Correos automáticos: marcas de envío por reserva y ajustes editables desde el panel.

alter table public.bookings
  add column if not exists send_emails boolean not null default true,
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists thanks_sent_at timestamptz;

alter table public.settings
  add column if not exists check_in_until text not null default '',
  add column if not exists notify_emails text not null default '',
  add column if not exists email_reminders boolean not null default true,
  add column if not exists reminder_days int not null default 2 check (reminder_days between 1 and 7),
  add column if not exists email_thanks boolean not null default true,
  add column if not exists email_abandoned boolean not null default true;
