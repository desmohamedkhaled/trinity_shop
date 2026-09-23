-- V3.4: disambiguate the checkout subtotal accumulator from orders.subtotal.
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
  order_subtotal numeric(10,2) := 0;
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
    order_subtotal := order_subtotal + line_total;
    insert into public.order_items(order_id, product_id, product_name, product_image, unit_price, quantity, line_total)
    values (order_id, product_row.id, product_row.name, product_row.image_url, product_row.price, quantity, line_total);
    update public.products set stock = stock - quantity, updated_at = now() where id = product_row.id;
  end loop;

  update public.orders
  set subtotal = order_subtotal, total = order_subtotal, updated_at = now()
  where id = order_id
  returning * into order_row;

  return jsonb_build_object('order', to_jsonb(order_row), 'items', coalesce((select jsonb_agg(to_jsonb(oi)) from public.order_items oi where oi.order_id = order_id), '[]'::jsonb));
end;
$$;

revoke all on function public.create_checkout_order(jsonb, jsonb) from public;
grant execute on function public.create_checkout_order(jsonb, jsonb) to service_role;
