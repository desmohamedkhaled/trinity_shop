-- Trinity production schema starter.
create extension if not exists "pgcrypto";

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  meaning text,
  length numeric,
  width numeric,
  height numeric,
  weight numeric,
  price numeric(10,2) not null default 0,
  category text,
  stock integer not null default 0,
  image_url text,
  is_featured boolean not null default false,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists product_shipping_locations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  state text not null check (state in ('NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT')),
  suburb text not null default '',
  metro text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, state)
);

create index if not exists product_shipping_locations_product_id_idx on product_shipping_locations(product_id);

create table if not exists occasions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  subtitle text,
  image_url text,
  sort_order integer not null default 0,
  is_published boolean not null default true
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists gift_lists (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null,
  status text not null default 'draft',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists gift_list_items (
  id uuid primary key default gen_random_uuid(),
  gift_list_id uuid not null references gift_lists(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  quantity integer not null default 1
);

create table if not exists requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null,
  gift_list_id uuid references gift_lists(id) on delete set null,
  occasion text,
  status text not null default 'pending',
  admin_notes text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(10,2) not null default 0
);

create table if not exists site_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'admin' check (role in ('super_admin','admin','content_manager','order_manager','product_manager','editor','viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into site_settings(key,value) values
 ('whatsapp_checkout_enabled','true'),
 ('whatsapp_number',''),
 ('store_name','Trinity Christian Gift Shop')
on conflict (key) do nothing;

create table if not exists pages (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  seo_title text,
  seo_description text,
  is_published boolean not null default true
);

create table if not exists page_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references pages(id) on delete cascade,
  section_type text not null,
  content jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_visible boolean not null default true
);

create table if not exists gift_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table if not exists gift_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references gift_questions(id) on delete cascade,
  label text not null,
  value text not null
);

create table if not exists gift_rules (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references gift_options(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  weight integer not null default 1
);

create table if not exists media (
  id uuid primary key default gen_random_uuid(),
  file_path text not null,
  alt_text text,
  type text,
  created_at timestamptz not null default now()
);

-- Turn on RLS for sensitive tables.
alter table customers enable row level security;
alter table gift_lists enable row level security;
alter table gift_list_items enable row level security;
alter table requests enable row level security;

-- Public catalog read policies can be added for published products/occasions.
alter table products enable row level security;
create policy "public can read published products" on products
  for select using (is_published = true);

alter table product_shipping_locations enable row level security;

alter table occasions enable row level security;
create policy "public can read published occasions" on occasions
  for select using (is_published = true);

-- IMPORTANT: Add authenticated admin policies based on your chosen role model.
-- Never expose SUPABASE_SERVICE_ROLE_KEY in browser code.


-- Public settings are intentionally readable; admin writes require membership in admin_users.
alter table site_settings enable row level security;
alter table admin_users enable row level security;
alter table request_items enable row level security;

create policy "public can read checkout settings" on site_settings for select using (key in ('whatsapp_checkout_enabled','whatsapp_number','store_name'));
create policy "admins can read settings" on site_settings for select using (exists (select 1 from admin_users a where a.id = auth.uid() and a.is_active = true));
create policy "admins can write settings" on site_settings for all using (exists (select 1 from admin_users a where a.id = auth.uid() and a.is_active = true)) with check (exists (select 1 from admin_users a where a.id = auth.uid() and a.is_active = true));

alter table products enable row level security;
create policy "admins manage products" on products for all using (exists (select 1 from admin_users a where a.id = auth.uid() and a.is_active = true)) with check (exists (select 1 from admin_users a where a.id = auth.uid() and a.is_active = true));
create policy "admins manage product shipping locations" on product_shipping_locations for all using (exists (select 1 from admin_users a where a.id = auth.uid() and a.is_active = true)) with check (exists (select 1 from admin_users a where a.id = auth.uid() and a.is_active = true));
alter table occasions enable row level security;
create policy "admins manage occasions" on occasions for all using (exists (select 1 from admin_users a where a.id = auth.uid() and a.is_active = true)) with check (exists (select 1 from admin_users a where a.id = auth.uid() and a.is_active = true));

create policy "admins manage requests" on requests for all using (exists (select 1 from admin_users a where a.id = auth.uid() and a.is_active = true)) with check (exists (select 1 from admin_users a where a.id = auth.uid() and a.is_active = true));
create policy "admins manage request items" on request_items for all using (exists (select 1 from admin_users a where a.id = auth.uid() and a.is_active = true)) with check (exists (select 1 from admin_users a where a.id = auth.uid() and a.is_active = true));

-- Customers are written by the server request endpoint; keep them private from the public browser role.
revoke all on customers from anon;
revoke all on requests from anon;
revoke all on request_items from anon;

-- Replace the public POST endpoint with a server-side service key in production if your project requires strict RLS on inserts.

-- Product matching fields used by the Gift Finder.
alter table products add column if not exists occasion text[] not null default '{}';
alter table products add column if not exists gift_for text[] not null default '{}';

-- Public media bucket for catalog assets.
insert into storage.buckets (id,name,public) values ('trinity-media','trinity-media',true) on conflict (id) do nothing;
create policy "public can view Trinity media" on storage.objects for select using (bucket_id = 'trinity-media');
create policy "admins can upload Trinity media" on storage.objects for insert with check (bucket_id = 'trinity-media' and exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active = true));
create policy "admins can update Trinity media" on storage.objects for update using (bucket_id = 'trinity-media' and exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active = true));
create policy "admins can delete Trinity media" on storage.objects for delete using (bucket_id = 'trinity-media' and exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active = true));
create policy "admins can read own admin profile" on admin_users for select using (id = auth.uid());
