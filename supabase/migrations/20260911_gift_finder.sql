-- Gift Finder request fields and admin recommendations.
alter table public.requests add column if not exists request_type text not null default 'gift_request';
alter table public.requests add column if not exists gift_for text;
alter table public.requests add column if not exists budget_min numeric(10,2);
alter table public.requests add column if not exists budget_max numeric(10,2);
alter table public.requests add column if not exists gift_category text;
alter table public.requests add column if not exists preferences text;
alter table public.requests add column if not exists recipient text;
alter table public.requests add column if not exists updated_at timestamptz not null default now();

create table if not exists public.request_recommendations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  admin_notes text,
  created_at timestamptz not null default now(),
  unique(request_id, product_id)
);

alter table public.request_recommendations enable row level security;
create policy "admins manage request recommendations" on public.request_recommendations for all using (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active = true)) with check (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active = true));
