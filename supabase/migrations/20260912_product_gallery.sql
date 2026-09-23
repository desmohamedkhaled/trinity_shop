create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_images_product_id on public.product_images(product_id);
create index if not exists idx_product_images_product_sort on public.product_images(product_id, sort_order);

alter table public.product_images enable row level security;

drop policy if exists "public can read published product galleries" on public.product_images;
create policy "public can read published product galleries"
on public.product_images for select
using (exists (
  select 1 from public.products p
  where p.id = product_images.product_id and p.is_published = true
));

drop policy if exists "admins manage product galleries" on public.product_images;
create policy "admins manage product galleries"
on public.product_images for all
using (exists (
  select 1 from public.admin_users a
  where a.id = auth.uid() and a.is_active = true
))
with check (exists (
  select 1 from public.admin_users a
  where a.id = auth.uid() and a.is_active = true
));