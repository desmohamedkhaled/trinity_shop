-- Trinity Events management table.
-- Creates the public event content table and standard RLS policies matching
-- the existing admin_users table conventions in the repository.

create extension if not exists pgcrypto;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  image_url text not null,
  description text not null,
  event_date date not null,
  start_time time not null,
  end_time time,
  location text,
  button_text text,
  button_url text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  is_featured boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events enable row level security;

create policy if not exists "public can read published events" on public.events
  for select using (status = 'published');

create policy if not exists "admins manage events" on public.events
  for all using (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active = true))
  with check (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active = true));

create index if not exists events_status_date_idx on public.events(status, event_date, start_time);
create index if not exists events_slug_idx on public.events(slug);
create index if not exists events_featured_idx on public.events(is_featured, status);
