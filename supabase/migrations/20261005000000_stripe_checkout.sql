-- Stripe checkout support for pending payment orders.

alter table public.orders
  add column if not exists payment_provider text not null default 'manual' check (payment_provider in ('manual', 'stripe')),
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists stock_reservation_status text not null default 'not_applicable'
    check (stock_reservation_status in ('not_applicable', 'reserved', 'consumed', 'released'));

create unique index if not exists idx_orders_stripe_checkout_session_id
  on public.orders(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create index if not exists idx_orders_stripe_payment_intent_id
  on public.orders(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create or replace function public.create_stripe_pending_order(customer jsonb, items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  customer_id uuid;
  v_order_id uuid;
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

  select c.id into customer_id
  from public.customers c
  where c.phone = customer_phone
     or (customer_email is not null and lower(c.email) = lower(customer_email))
  order by c.created_at desc
  limit 1;

  if customer_id is null then
    insert into public.customers(name, email, phone)
    values (customer_name, customer_email, customer_phone)
    returning id into customer_id;
  else
    update public.customers
    set name = customer_name,
        email = coalesce(customer_email, email),
        phone = customer_phone
    where id = customer_id;
  end if;

  order_number := 'TRN-' || to_char(now(), 'YYYYMMDD') || '-' ||
                  upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.orders(
    order_number, customer_id, customer_name, customer_phone, customer_email,
    country, governorate, city, address, payment_provider,
    payment_status, status, stock_reservation_status
  )
  values (
    order_number, customer_id, customer_name, customer_phone, customer_email,
    trim(customer->>'country'), trim(customer->>'governorate'), trim(customer->>'city'),
    trim(customer->>'address'), 'stripe', 'pending', 'pending', 'reserved'
  )
  returning id into v_order_id;

  for item in select * from jsonb_array_elements(items) loop
    if jsonb_typeof(item) <> 'object' or item->>'id' is null then
      raise exception 'Invalid cart item';
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
      raise exception 'Only % items are available for %', product_row.stock, product_row.name;
    end if;

    line_total := product_row.price * quantity;
    subtotal := subtotal + line_total;

    insert into public.order_items(
      order_id, product_id, product_name, product_image, unit_price, quantity, line_total
    )
    values (
      v_order_id, product_row.id, product_row.name, product_row.image_url,
      product_row.price, quantity, line_total
    );

    update public.products
    set stock = stock - quantity, updated_at = now()
    where id = product_row.id;
  end loop;

  update public.orders
  set subtotal = subtotal, total = subtotal, updated_at = now()
  where id = v_order_id
  returning * into order_row;

  return jsonb_build_object(
    'order', to_jsonb(order_row),
    'items', coalesce(
      (select jsonb_agg(to_jsonb(oi)) from public.order_items oi where oi.order_id = v_order_id),
      '[]'::jsonb
    )
  );
end;
$$;

create or replace function public.release_stripe_stock(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.orders%rowtype;
  item record;
begin
  select * into order_row
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Stripe order not found';
  end if;

  if order_row.payment_provider <> 'stripe' then
    raise exception 'Order is not a Stripe order';
  end if;

  if order_row.payment_status = 'paid' or order_row.stock_reservation_status = 'consumed' then
    return false;
  end if;

  if order_row.stock_reservation_status <> 'reserved' then
    return false;
  end if;

  for item in
    select product_id, quantity
    from public.order_items
    where public.order_items.order_id = p_order_id
      and product_id is not null
  loop
    update public.products
    set stock = stock + item.quantity, updated_at = now()
    where id = item.product_id;
  end loop;

  update public.orders
  set stock_reservation_status = 'released',
      payment_status = case when payment_status = 'paid' then 'paid' else 'failed' end,
      updated_at = now()
  where id = p_order_id;

  return true;
end;
$$;

create or replace function public.complete_stripe_payment(
  p_order_id uuid,
  checkout_session_id text,
  payment_intent_id text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.orders%rowtype;
begin
  select * into order_row
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Stripe order not found';
  end if;

  if order_row.payment_provider <> 'stripe' then
    raise exception 'Order is not a Stripe order';
  end if;

  if order_row.payment_status = 'paid' and order_row.stock_reservation_status = 'consumed' then
    return false;
  end if;

  if order_row.stock_reservation_status = 'released' or order_row.payment_status = 'failed' then
    return false;
  end if;

  update public.orders
  set payment_status = 'paid',
      status = 'confirmed',
      stock_reservation_status = 'consumed',
      stripe_checkout_session_id = coalesce(checkout_session_id, stripe_checkout_session_id),
      stripe_payment_intent_id = coalesce(payment_intent_id, stripe_payment_intent_id),
      updated_at = now()
  where id = p_order_id;

  return true;
end;
$$;

revoke all on function public.create_stripe_pending_order(jsonb, jsonb) from public;
revoke all on function public.release_stripe_stock(uuid) from public;
revoke all on function public.complete_stripe_payment(uuid, text, text) from public;
grant execute on function public.create_stripe_pending_order(jsonb, jsonb) to service_role;
grant execute on function public.release_stripe_stock(uuid) to service_role;
grant execute on function public.complete_stripe_payment(uuid, text, text) to service_role;
