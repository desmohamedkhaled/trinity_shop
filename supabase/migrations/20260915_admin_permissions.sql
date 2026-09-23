-- Feature 3: normalized permissions and per-user custom grants.
-- Run after 20260915_admin_workspace_roles.sql.

create table if not exists public.permissions (
  key text primary key,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_user_permissions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.admin_users(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  created_at timestamptz not null default now(),
  unique(admin_user_id, permission_key)
);

alter table public.permissions enable row level security;
alter table public.admin_user_permissions enable row level security;

create policy "admins can read permissions" on public.permissions
  for select using (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active = true));
create policy "users can read own permission grants" on public.admin_user_permissions
  for select using (admin_user_id = auth.uid());
create policy "super admins manage permission grants" on public.admin_user_permissions
  for all using (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active = true and a.role = 'super_admin'))
  with check (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active = true and a.role = 'super_admin'));

insert into public.permissions(key, description) values
 ('dashboard.read','View the admin dashboard'),
 ('products.read','View products'), ('products.create','Create products'), ('products.update','Edit products'), ('products.delete','Delete products'),
 ('inventory.read','View inventory'), ('inventory.update','Edit inventory'),
 ('orders.read','View orders'), ('orders.create','Create orders'), ('orders.update','Edit orders'), ('orders.delete','Delete orders'),
 ('customers.read','View customers'), ('customers.update','Edit customers'), ('customers.delete','Delete customers'),
 ('requests.read','View requests'), ('requests.update','Edit requests'), ('requests.delete','Delete requests'),
 ('events.read','View events'), ('events.create','Create events'), ('events.update','Edit events'), ('events.delete','Delete events'),
 ('occasions.read','View occasions'), ('occasions.create','Create occasions'), ('occasions.update','Edit occasions'), ('occasions.delete','Delete occasions'),
 ('media.read','View media'), ('media.upload','Upload media'), ('media.delete','Delete media'),
 ('pages.read','View homepage and pages'), ('pages.update','Edit homepage and pages'),
 ('gift_finder.read','View Gift Finder'), ('gift_finder.update','Edit Gift Finder'),
 ('gift_lists.read','View gift lists'), ('gift_lists.update','Edit gift lists'), ('gift_lists.delete','Delete gift lists'),
 ('settings.read','View settings'), ('settings.update','Edit settings'),
 ('users.read','View admin users'), ('users.create','Create admin users'), ('users.update','Edit admin users'), ('users.deactivate','Activate/deactivate admin users'), ('users.permissions','Manage custom permissions')
on conflict (key) do update set description = excluded.description;

-- Seed default grants for the pre-existing specialized roles. Super admin and admin
-- are handled as full/default-global roles in application code.
insert into public.admin_user_permissions(admin_user_id, permission_key)
select a.id, p.key
from public.admin_users a
cross join public.permissions p
where a.role = 'product_manager'
  and p.key in ('dashboard.read','products.read','products.create','products.update','products.delete','inventory.read','inventory.update','media.read','media.upload')
on conflict do nothing;

insert into public.admin_user_permissions(admin_user_id, permission_key)
select a.id, p.key
from public.admin_users a
cross join public.permissions p
where a.role = 'order_manager'
  and p.key in ('dashboard.read','orders.read','orders.create','orders.update','orders.delete','requests.read','requests.update','requests.delete','customers.read','customers.update','gift_lists.read','gift_lists.update','gift_lists.delete','gift_finder.read')
on conflict do nothing;

insert into public.admin_user_permissions(admin_user_id, permission_key)
select a.id, p.key
from public.admin_users a
cross join public.permissions p
where a.role = 'content_manager'
  and p.key in ('dashboard.read','pages.read','pages.update','occasions.read','occasions.create','occasions.update','occasions.delete','events.read','events.create','events.update','events.delete','media.read','media.upload','media.delete','gift_finder.read','gift_finder.update')
on conflict do nothing;

insert into public.admin_user_permissions(admin_user_id, permission_key)
select a.id, p.key
from public.admin_users a
cross join public.permissions p
where a.role = 'viewer'
  and p.key like '%.read'
on conflict do nothing;

insert into public.admin_user_permissions(admin_user_id, permission_key)
select a.id, 'dashboard.read'
from public.admin_users a
where a.role = 'editor'
on conflict do nothing;
