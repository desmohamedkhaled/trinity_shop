-- Feature 3 V2: normalize order statuses and customer matching.
-- This migration preserves existing rows and keeps the existing tables/relationships.

update public.orders
set status = case status
  when 'processing' then 'preparing'
  when 'shipped' then 'completed'
  when 'delivered' then 'completed'
  when 'cancelled' then 'canceled'
  else status
end
where status in ('processing', 'shipped', 'delivered', 'cancelled');

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending', 'contacted', 'confirmed', 'preparing', 'completed', 'canceled'));

update public.requests
set status = 'canceled'
where status = 'cancelled';

create index if not exists idx_customers_normalized_email
  on public.customers (lower(trim(email)))
  where email is not null and trim(email) <> '';

create index if not exists idx_customers_normalized_phone
  on public.customers (regexp_replace(phone, '[^0-9]', '', 'g'))
  where phone is not null and regexp_replace(phone, '[^0-9]', '', 'g') <> '';

create or replace function public.find_or_create_customer(customer_name text, customer_email text, customer_phone text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  customer_id uuid;
  normalized_email text := nullif(lower(trim(customer_email)), '');
  normalized_phone text := nullif(regexp_replace(coalesce(customer_phone, ''), '[^0-9]', '', 'g'), '');
begin
  if nullif(trim(customer_name), '') is null or (normalized_email is null and normalized_phone is null) then
    raise exception 'A customer name and email or phone are required';
  end if;

  if normalized_email is not null then
    perform pg_advisory_xact_lock(hashtextextended('customer-email:' || normalized_email, 0));
    select c.id into customer_id from public.customers c
    where lower(trim(c.email)) = normalized_email
    order by c.created_at asc limit 1 for update;
  else
    perform pg_advisory_xact_lock(hashtextextended('customer-phone:' || normalized_phone, 0));
    select c.id into customer_id from public.customers c
    where regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g') = normalized_phone
    order by c.created_at asc limit 1 for update;
  end if;

  if customer_id is null then
    insert into public.customers(name, email, phone)
    values (trim(customer_name), normalized_email, normalized_phone)
    returning id into customer_id;
  else
    update public.customers
    set name = coalesce(name, trim(customer_name)),
        email = coalesce(email, normalized_email),
        phone = coalesce(nullif(regexp_replace(phone, '[^0-9]', '', 'g'), ''), normalized_phone)
    where id = customer_id;
  end if;
  return customer_id;
end;
$$;

revoke all on function public.find_or_create_customer(text, text, text) from public;
grant execute on function public.find_or_create_customer(text, text, text) to service_role;

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
  normalized_email text;
  normalized_phone text;
begin
  if customer is null or jsonb_typeof(customer) <> 'object' then
    raise exception 'Invalid customer payload';
  end if;
  if items is null or jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then
    raise exception 'Cart is empty';
  end if;

  customer_name := nullif(trim(customer->>'name'), '');
  customer_phone := nullif(trim(customer->>'phone'), '');
  customer_email := nullif(lower(trim(customer->>'email')), '');
  normalized_email := customer_email;
  normalized_phone := nullif(regexp_replace(coalesce(customer_phone, ''), '[^0-9]', '', 'g'), '');

  if customer_name is null or customer_phone is null
     or nullif(trim(customer->>'country'), '') is null
     or nullif(trim(customer->>'governorate'), '') is null
     or nullif(trim(customer->>'city'), '') is null
     or nullif(trim(customer->>'address'), '') is null then
    raise exception 'Required customer details are missing';
  end if;

  select public.find_or_create_customer(customer_name, customer_email, normalized_phone) into customer_id;

  order_number := 'TRN-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.orders(order_number, customer_id, customer_name, customer_phone, customer_email, country, governorate, city, address)
  values (order_number, customer_id, customer_name, normalized_phone, customer_email, trim(customer->>'country'), trim(customer->>'governorate'), trim(customer->>'city'), trim(customer->>'address'))
  returning id into order_id;

  for item in select * from jsonb_array_elements(items) loop
    if jsonb_typeof(item) <> 'object' then raise exception 'Invalid cart item'; end if;
    quantity := coalesce((item->>'quantity')::integer, 0);
    if item->>'id' is null or trim(item->>'id') = '' then raise exception 'Product id is required'; end if;
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
