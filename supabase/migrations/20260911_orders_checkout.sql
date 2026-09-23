-- Trinity checkout migration.
-- Run this in Supabase before enabling the cart checkout flow.

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  country text not null,
  governorate text not null,
  city text not null,
  address text not null,
  subtotal numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  shipping numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending','confirmed','processing','shipped','delivered','cancelled')),
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed','refunded')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  product_image text,
  unit_price numeric(10,2) not null,
  quantity integer not null check (quantity > 0),
  line_total numeric(10,2) not null
);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "admins manage orders" on public.orders for all using (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active = true)) with check (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active = true));
create policy "admins manage order items" on public.order_items for all using (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active = true)) with check (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active = true));

create or replace function public.create_checkout_order(customer jsonb, items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  customer_id uuid;
  order_id uuid;
  order_number text;
  subtotal numeric(10,2) := 0;
  item jsonb;
  product_row public.products%rowtype;
  quantity integer;
  line_total numeric(10,2);
  order_row public.orders%rowtype;
begin
  if coalesce(trim(customer->>'name'), '') = '' or coalesce(trim(customer->>'phone'), '') = '' or coalesce(trim(customer->>'country'), '') = '' or coalesce(trim(customer->>'governorate'), '') = '' or coalesce(trim(customer->>'city'), '') = '' or coalesce(trim(customer->>'address'), '') = '' then
    raise exception 'Required customer details are missing';
  end if;
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then raise exception 'Cart is empty'; end if;

  insert into public.customers(name, email, phone)
  values (trim(customer->>'name'), nullif(trim(customer->>'email'), ''), trim(customer->>'phone'))
  returning id into customer_id;

  order_number := 'TRN-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.orders(order_number, customer_id, customer_name, customer_phone, customer_email, country, governorate, city, address)
  values (order_number, customer_id, trim(customer->>'name'), trim(customer->>'phone'), nullif(trim(customer->>'email'), ''), trim(customer->>'country'), trim(customer->>'governorate'), trim(customer->>'city'), trim(customer->>'address'))
  returning id into order_id;

  for item in select * from jsonb_array_elements(items) loop
    quantity := (item->>'quantity')::integer;
    if quantity < 1 or quantity > 99 then raise exception 'Invalid quantity'; end if;
    select * into product_row from public.products where id = (item->>'id')::uuid and is_published = true for update;
    if not found then raise exception 'Product is unavailable'; end if;
    if product_row.stock < quantity then raise exception 'Only % items are available for %', product_row.stock, product_row.name; end if;
    line_total := product_row.price * quantity;
    subtotal := subtotal + line_total;
    insert into public.order_items(order_id, product_id, product_name, product_image, unit_price, quantity, line_total)
    values (order_id, product_row.id, product_row.name, product_row.image_url, product_row.price, quantity, line_total);
    update public.products set stock = stock - quantity, updated_at = now() where id = product_row.id;
  end loop;

  update public.orders set subtotal = subtotal, total = subtotal, updated_at = now() where id = order_id returning * into order_row;
  return jsonb_build_object('order', to_jsonb(order_row), 'items', coalesce((select jsonb_agg(to_jsonb(oi)) from public.order_items oi where oi.order_id = order_id), '[]'::jsonb));
end;
$$;

revoke all on function public.create_checkout_order(jsonb, jsonb) from public;
grant execute on function public.create_checkout_order(jsonb, jsonb) to service_role;
