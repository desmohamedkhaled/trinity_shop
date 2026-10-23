-- Product variants preserve the existing product row while adding independent
-- size/design pricing, stock, dimensions, and galleries.
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  length numeric check (length is null or length >= 0),
  width numeric check (width is null or width >= 0),
  height numeric check (height is null or height >= 0),
  weight numeric check (weight is null or weight >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_variants_product_id_idx
  on public.product_variants(product_id, sort_order);

create table if not exists public.product_variant_images (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  image_url text not null,
  alt_text text,
  sort_order integer not null default 0
);

create index if not exists product_variant_images_variant_id_idx
  on public.product_variant_images(variant_id, sort_order);
create unique index if not exists product_variant_images_variant_url_idx
  on public.product_variant_images(variant_id, image_url);

alter table public.products
  add column if not exists stock_status text not null default 'In stock'
    check (stock_status in ('In stock', 'Out of stock'));

alter table public.order_items
  add column if not exists variant_id uuid references public.product_variants(id) on delete set null,
  add column if not exists variant_name text,
  add column if not exists length numeric,
  add column if not exists width numeric,
  add column if not exists height numeric,
  add column if not exists weight numeric;

alter table public.product_variants enable row level security;
alter table public.product_variant_images enable row level security;

drop policy if exists "public can read published product variants" on public.product_variants;
create policy "public can read published product variants"
on public.product_variants for select
using (exists (
  select 1 from public.products p
  where p.id = product_variants.product_id and p.is_published = true
));

drop policy if exists "public can read published product variant galleries" on public.product_variant_images;
create policy "public can read published product variant galleries"
on public.product_variant_images for select
using (exists (
  select 1
  from public.product_variants v
  join public.products p on p.id = v.product_id
  where v.id = product_variant_images.variant_id and p.is_published = true
));

drop policy if exists "admins manage product variants" on public.product_variants;
create policy "admins manage product variants"
on public.product_variants for all
using (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active))
with check (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active));

drop policy if exists "admins manage product variant galleries" on public.product_variant_images;
create policy "admins manage product variant galleries"
on public.product_variant_images for all
using (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active))
with check (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active));

create or replace function public.create_checkout_order(customer jsonb, items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  customer_id uuid;
  order_id uuid;
  order_number text;
  order_subtotal numeric(10,2) := 0;
  item jsonb;
  product_row public.products%rowtype;
  variant_row public.product_variants%rowtype;
  quantity integer;
  line_total numeric(10,2);
  order_row public.orders%rowtype;
  selected_variant uuid;
begin
  if customer is null or jsonb_typeof(customer) <> 'object' then raise exception 'Invalid customer payload'; end if;
  if items is null or jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then raise exception 'Cart is empty'; end if;
  if nullif(trim(customer->>'name'), '') is null or nullif(trim(customer->>'phone'), '') is null
     or nullif(trim(customer->>'country'), '') is null or nullif(trim(customer->>'governorate'), '') is null
     or nullif(trim(customer->>'city'), '') is null or nullif(trim(customer->>'address'), '') is null then
    raise exception 'Required customer details are missing';
  end if;

  insert into public.customers(name, email, phone)
  values (trim(customer->>'name'), nullif(trim(customer->>'email'), ''), trim(customer->>'phone'))
  returning id into customer_id;
  order_number := 'TRN-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.orders(order_number, customer_id, customer_name, customer_phone, customer_email, country, governorate, city, address)
  values (order_number, customer_id, trim(customer->>'name'), trim(customer->>'phone'), nullif(trim(customer->>'email'), ''), trim(customer->>'country'), trim(customer->>'governorate'), trim(customer->>'city'), trim(customer->>'address'))
  returning id into order_id;

  for item in select * from jsonb_array_elements(items) loop
    quantity := coalesce((item->>'quantity')::integer, 0);
    if quantity < 1 or quantity > 99 then raise exception 'Invalid quantity'; end if;
    selected_variant := nullif(item->>'variant_id', '')::uuid;
    select * into product_row from public.products where id = (item->>'id')::uuid and is_published for update;
    if not found or product_row.stock_status <> 'In stock' then raise exception 'Product is unavailable'; end if;

    if selected_variant is not null then
      select * into variant_row from public.product_variants where id = selected_variant and product_id = product_row.id for update;
      if not found or variant_row.stock < quantity then raise exception 'Selected option is no longer available'; end if;
      line_total := variant_row.price * quantity;
      insert into public.order_items(order_id, product_id, variant_id, product_name, variant_name, product_image, unit_price, quantity, line_total, length, width, height, weight)
      values (order_id, product_row.id, variant_row.id, product_row.name, variant_row.name, product_row.image_url, variant_row.price, quantity, line_total, variant_row.length, variant_row.width, variant_row.height, variant_row.weight);
      update public.product_variants set stock = stock - quantity, updated_at = now() where id = variant_row.id;
    else
      if product_row.stock < quantity then raise exception 'Only % items are available for %', product_row.stock, product_row.name; end if;
      line_total := product_row.price * quantity;
      insert into public.order_items(order_id, product_id, product_name, product_image, unit_price, quantity, line_total, length, width, height, weight)
      values (order_id, product_row.id, product_row.name, product_row.image_url, product_row.price, quantity, line_total, product_row.length, product_row.width, product_row.height, product_row.weight);
      update public.products set stock = stock - quantity, updated_at = now() where id = product_row.id;
    end if;
    order_subtotal := order_subtotal + line_total;
  end loop;

  update public.orders set subtotal = order_subtotal, total = order_subtotal, updated_at = now() where id = order_id returning * into order_row;
  return jsonb_build_object('order', to_jsonb(order_row), 'items', coalesce((select jsonb_agg(to_jsonb(oi)) from public.order_items oi where oi.order_id = order_id), '[]'::jsonb));
end;
$$;

revoke all on function public.create_checkout_order(jsonb, jsonb) from public;
grant execute on function public.create_checkout_order(jsonb, jsonb) to service_role;

create or replace function public.create_stripe_pending_order(customer jsonb, items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  customer_id uuid;
  order_id uuid;
  order_number text;
  order_subtotal numeric(10,2) := 0;
  item jsonb;
  product_row public.products%rowtype;
  variant_row public.product_variants%rowtype;
  quantity integer;
  line_total numeric(10,2);
  order_row public.orders%rowtype;
  selected_variant uuid;
begin
  if customer is null or jsonb_typeof(customer) <> 'object' or items is null or jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then raise exception 'Invalid checkout payload'; end if;
  if nullif(trim(customer->>'name'), '') is null or nullif(trim(customer->>'phone'), '') is null or nullif(trim(customer->>'country'), '') is null or nullif(trim(customer->>'governorate'), '') is null or nullif(trim(customer->>'city'), '') is null or nullif(trim(customer->>'address'), '') is null then raise exception 'Required customer details are missing'; end if;
  insert into public.customers(name, email, phone) values (trim(customer->>'name'), nullif(trim(customer->>'email'), ''), trim(customer->>'phone')) returning id into customer_id;
  order_number := 'TRN-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.orders(order_number, customer_id, customer_name, customer_phone, customer_email, country, governorate, city, address, payment_provider, stock_reservation_status)
  values (order_number, customer_id, trim(customer->>'name'), trim(customer->>'phone'), nullif(trim(customer->>'email'), ''), trim(customer->>'country'), trim(customer->>'governorate'), trim(customer->>'city'), trim(customer->>'address'), 'stripe', 'reserved') returning id into order_id;
  for item in select * from jsonb_array_elements(items) loop
    quantity := coalesce((item->>'quantity')::integer, 0);
    if quantity < 1 or quantity > 99 then raise exception 'Invalid quantity'; end if;
    selected_variant := nullif(item->>'variant_id', '')::uuid;
    select * into product_row from public.products where id = (item->>'id')::uuid and is_published for update;
    if not found or product_row.stock_status <> 'In stock' then raise exception 'Product is unavailable'; end if;
    if selected_variant is not null then
      select * into variant_row from public.product_variants where id = selected_variant and product_id = product_row.id for update;
      if not found or variant_row.stock < quantity then raise exception 'Selected option is no longer available'; end if;
      line_total := variant_row.price * quantity;
      insert into public.order_items(order_id, product_id, variant_id, product_name, variant_name, product_image, unit_price, quantity, line_total, length, width, height, weight) values (order_id, product_row.id, variant_row.id, product_row.name, variant_row.name, product_row.image_url, variant_row.price, quantity, line_total, variant_row.length, variant_row.width, variant_row.height, variant_row.weight);
      update public.product_variants set stock = stock - quantity, updated_at = now() where id = variant_row.id;
    else
      if product_row.stock < quantity then raise exception 'Only % items are available for %', product_row.stock, product_row.name; end if;
      line_total := product_row.price * quantity;
      insert into public.order_items(order_id, product_id, product_name, product_image, unit_price, quantity, line_total, length, width, height, weight) values (order_id, product_row.id, product_row.name, product_row.image_url, product_row.price, quantity, line_total, product_row.length, product_row.width, product_row.height, product_row.weight);
      update public.products set stock = stock - quantity, updated_at = now() where id = product_row.id;
    end if;
    order_subtotal := order_subtotal + line_total;
  end loop;
  update public.orders set subtotal = order_subtotal, total = order_subtotal where id = order_id returning * into order_row;
  return jsonb_build_object('order', to_jsonb(order_row), 'items', coalesce((select jsonb_agg(to_jsonb(oi)) from public.order_items oi where oi.order_id = order_id), '[]'::jsonb));
end;
$$;

revoke all on function public.create_stripe_pending_order(jsonb, jsonb) from public;
grant execute on function public.create_stripe_pending_order(jsonb, jsonb) to service_role;

create or replace function public.release_stripe_stock(p_order_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  order_row public.orders%rowtype;
  item record;
begin
  select * into order_row from public.orders where id = p_order_id for update;
  if not found then raise exception 'Stripe order not found'; end if;
  if order_row.payment_provider <> 'stripe' then raise exception 'Order is not a Stripe order'; end if;
  if order_row.payment_status = 'paid' or order_row.stock_reservation_status = 'consumed' then return false; end if;
  if order_row.stock_reservation_status <> 'reserved' then return false; end if;
  for item in select product_id, variant_id, quantity from public.order_items where order_id = p_order_id and product_id is not null loop
    if item.variant_id is not null then
      update public.product_variants set stock = stock + item.quantity, updated_at = now() where id = item.variant_id;
    else
      update public.products set stock = stock + item.quantity, updated_at = now() where id = item.product_id;
    end if;
  end loop;
  update public.orders set stock_reservation_status = 'released', payment_status = 'failed', updated_at = now() where id = p_order_id;
  return true;
end;
$$;

create or replace function public.complete_stripe_payment(
  p_order_id uuid,
  checkout_session_id text,
  payment_intent_id text
)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  order_row public.orders%rowtype;
begin
  select * into order_row from public.orders where id = p_order_id for update;
  if not found then raise exception 'Stripe order not found'; end if;
  if order_row.payment_provider <> 'stripe' then raise exception 'Order is not a Stripe order'; end if;
  if order_row.payment_status = 'paid' and order_row.stock_reservation_status = 'consumed' then return false; end if;
  if order_row.stock_reservation_status = 'released' or order_row.payment_status = 'failed' then return false; end if;
  update public.orders
  set payment_status = 'paid', status = 'confirmed', stock_reservation_status = 'consumed',
      stripe_checkout_session_id = coalesce(checkout_session_id, stripe_checkout_session_id),
      stripe_payment_intent_id = coalesce(payment_intent_id, stripe_payment_intent_id),
      updated_at = now()
  where id = p_order_id;
  return true;
end;
$$;

revoke all on function public.release_stripe_stock(uuid) from public;
revoke all on function public.complete_stripe_payment(uuid, text, text) from public;
grant execute on function public.release_stripe_stock(uuid) to service_role;
grant execute on function public.complete_stripe_payment(uuid, text, text) to service_role;
