alter table public.products
  add column if not exists length numeric,
  add column if not exists width numeric,
  add column if not exists height numeric,
  add column if not exists weight numeric;

create table if not exists public.product_shipping_locations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  state text not null,
  suburb text not null default '',
  metro text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_shipping_locations_state_check check (state in ('NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT')),
  constraint product_shipping_locations_product_state_unique unique (product_id, state)
);

create index if not exists product_shipping_locations_product_id_idx
  on public.product_shipping_locations(product_id);

alter table public.product_shipping_locations enable row level security;

drop policy if exists "admins manage product shipping locations" on public.product_shipping_locations;
create policy "admins manage product shipping locations"
  on public.product_shipping_locations for all
  using (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active = true))
  with check (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active = true));
