create extension if not exists pgcrypto;

-- 1) Create the missing checkout tables only if absent.
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
  status text not null default 'pending'
    check (status in ('pending','confirmed','processing','shipped','delivered','cancelled')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending','paid','failed','refunded')),
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

-- 2) Required indexes only.
create index if not exists idx_orders_customer_id on public.orders(customer_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created_at on public.orders(created_at desc);
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_items_product_id on public.order_items(product_id);

-- 3) Keep site_settings untouched.
-- The app already uses key/value access.
-- No schema change, no drop of id, no primary key change.

-- 4) Create the exact RPC required by the app.
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

  customer_name text;
  customer_phone text;
  customer_email text;
begin
  if customer is null or jsonb_typeof(customer) <> 'object' then
    raise exception 'Invalid customer payload';
  end if;

  if items is null or jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then
    raise exception 'Cart is empty';
  end if;

  customer_name := trim(customer->>'name');
  customer_phone := trim(customer->>'phone');
  customer_email := nullif(trim(customer->>'email'), '');

  if customer_name = ''
     or customer_phone = ''
     or trim(customer->>'country') = ''
     or trim(customer->>'governorate') = ''
     or trim(customer->>'city') = ''
     or trim(customer->>'address') = '' then
    raise exception 'Required customer details are missing';
  end if;

  -- Reuse customer if an existing record matches by phone or email.
  select c.id into customer_id
  from public.customers c
  where (
    c.phone = customer_phone
    or (customer_email is not null and lower(c.email) = lower(customer_email))
  )
  order by c.created_at desc
  limit 1;

  if customer_id is null then
    insert into public.customers(name, email, phone)
    values (customer_name, customer_email, customer_phone)
    returning id into customer_id;
  else
    update public.customers
    set
      name = customer_name,
      email = coalesce(customer_email, email),
      phone = customer_phone
    where id = customer_id;
  end if;

  order_number := 'TRN-' || to_char(now(), 'YYYYMMDD') || '-' ||
                  upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.orders(
    order_number,
    customer_id,
    customer_name,
    customer_phone,
    customer_email,
    country,
    governorate,
    city,
    address
  )
  values (
    order_number,
    customer_id,
    customer_name,
    customer_phone,
    customer_email,
    trim(customer->>'country'),
    trim(customer->>'governorate'),
    trim(customer->>'city'),
    trim(customer->>'address')
  )
  returning id into order_id;

  for item in
    select * from jsonb_array_elements(items)
  loop
    if jsonb_typeof(item) <> 'object' then
      raise exception 'Invalid cart item';
    end if;

    if item->>'id' is null or trim(item->>'id') = '' then
      raise exception 'Product id is required';
    end if;

    quantity := coalesce((item->>'quantity')::integer, 0);

    if quantity < 1 or quantity > 99 then
      raise exception 'Invalid quantity';
    end if;

    select p.* into product_row
    from public.products p
    where p.id = (item->>'id')::uuid
      and p.is_published = true
    for update;

    if not found then
      raise exception 'Product is unavailable';
    end if;

    if product_row.stock < quantity then
      raise exception 'Only % items are available for %',
        product_row.stock,
        product_row.name;
    end if;

    line_total := product_row.price * quantity;
    subtotal := subtotal + line_total;

    insert into public.order_items(
      order_id,
      product_id,
      product_name,
      product_image,
      unit_price,
      quantity,
      line_total
    )
    values (
      order_id,
      product_row.id,
      product_row.name,
      product_row.image_url,
      product_row.price,
      quantity,
      line_total
    );

    update public.products
    set
      stock = stock - quantity,
      updated_at = now()
    where id = product_row.id;
  end loop;

  update public.orders
  set
    subtotal = subtotal,
    discount = 0,
    shipping = 0,
    total = subtotal,
    updated_at = now()
  where id = order_id
  returning * into order_row;

  return jsonb_build_object(
    'order', to_jsonb(order_row),
    'items', coalesce(
      (
        select jsonb_agg(to_jsonb(oi))
        from public.order_items oi
        where oi.order_id = order_id
      ),
      '[]'::jsonb
    )
  );
end;
$$;

revoke all on function public.create_checkout_order(jsonb, jsonb) from public;

grant execute on function public.create_checkout_order(jsonb, jsonb)
to service_role;

-- 5) Minimal required RLS for orders and order items.
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "admins manage orders" on public.orders;

create policy "admins manage orders"
on public.orders
for all
using (
  exists (
    select 1
    from public.admin_users a
    where a.id = auth.uid()
      and a.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.admin_users a
    where a.id = auth.uid()
      and a.is_active = true
  )
);

drop policy if exists "admins manage order items" on public.order_items;

create policy "admins manage order items"
on public.order_items
for all
using (
  exists (
    select 1
    from public.admin_users a
    where a.id = auth.uid()
      and a.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.admin_users a
    where a.id = auth.uid()
      and a.is_active = true
  )
);