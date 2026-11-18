-- Visual product and photo-level inventory.
-- Prepared locally only; do not execute against DEV or Production without review.

alter table public.products
  add column if not exists inventory_mode text not null default 'traditional';

alter table public.products
  drop constraint if exists products_inventory_mode_check;
alter table public.products
  add constraint products_inventory_mode_check
  check (inventory_mode in ('traditional', 'photo'));

alter table public.product_variants
  add column if not exists inventory_mode text not null default 'traditional';

alter table public.product_variants
  drop constraint if exists product_variants_inventory_mode_check;
alter table public.product_variants
  add constraint product_variants_inventory_mode_check
  check (inventory_mode in ('traditional', 'photo'));

-- available_quantity is the sole canonical artwork stock column. If an older
-- deployment already has it, its values are preserved.
alter table public.product_variant_images
  add column if not exists available_quantity integer not null default 0,
  add column if not exists low_stock_threshold integer not null default 2;

alter table public.product_variant_images
  drop constraint if exists product_variant_images_available_quantity_check;
alter table public.product_variant_images
  add constraint product_variant_images_available_quantity_check
  check (available_quantity >= 0);

alter table public.order_items
  add column if not exists image_id uuid references public.product_variant_images(id) on delete set null;

create index if not exists product_variant_images_available_quantity_idx
  on public.product_variant_images(variant_id, available_quantity);
create index if not exists order_items_image_id_idx
  on public.order_items(image_id);

create table if not exists public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  product_id uuid not null references public.products(id),
  variant_id uuid references public.product_variants(id),
  image_id uuid references public.product_variant_images(id),
  inventory_mode text not null check (inventory_mode in ('traditional', 'photo')),
  quantity integer not null check (quantity > 0),
  status text not null default 'reserved'
    check (status in ('reserved', 'consumed', 'released')),
  created_at timestamptz not null default now(),
  consumed_at timestamptz,
  released_at timestamptz,
  unique (order_item_id)
);

create index if not exists inventory_reservations_order_status_idx
  on public.inventory_reservations(order_id, status);
create unique index if not exists inventory_reservations_active_image_idx
  on public.inventory_reservations(image_id)
  where image_id is not null and status = 'reserved';

alter table public.inventory_reservations enable row level security;
drop policy if exists "admins read inventory reservations" on public.inventory_reservations;
create policy "admins read inventory reservations"
on public.inventory_reservations for select
using (exists (
  select 1 from public.admin_users a
  where a.id = auth.uid() and a.is_active
));

create or replace function public.trinity_sync_photo_inventory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_variant_id uuid;
  v_product_id uuid;
begin
  if pg_trigger_depth() > 1 then
    return coalesce(new, old);
  end if;

  for v_variant_id in
    select distinct id
    from (
      select case when tg_op <> 'DELETE' then new.variant_id end as id
      union all
      select case when tg_op <> 'INSERT' then old.variant_id end
    ) ids
    where id is not null
  loop
    select product_id into v_product_id
    from public.product_variants
    where id = v_variant_id
    for update;

    update public.product_variants v
    set stock = (
      select coalesce(sum(i.available_quantity), 0)::integer
      from public.product_variant_images i
      where i.variant_id = v_variant_id
    ),
    updated_at = now()
    where v.id = v_variant_id
      and v.inventory_mode = 'photo';

    update public.products p
    set stock = (
      select coalesce(sum(v.stock), 0)::integer
      from public.product_variants v
      where v.product_id = v_product_id
    ),
    updated_at = now()
    where p.id = v_product_id
      and (
        p.inventory_mode = 'photo'
        or exists (
          select 1 from public.product_variants v
          where v.product_id = v_product_id and v.inventory_mode = 'photo'
        )
      );
  end loop;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trinity_sync_photo_inventory on public.product_variant_images;
create trigger trinity_sync_photo_inventory
after insert or update of available_quantity, variant_id or delete
on public.product_variant_images
for each row execute function public.trinity_sync_photo_inventory();

create or replace function public.trinity_reserve_inventory(
  p_order_id uuid,
  p_order_item_id uuid,
  p_product_id uuid,
  p_variant_id uuid,
  p_image_id uuid,
  p_quantity integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mode text;
  v_reservation_id uuid;
  v_updated integer;
begin
  if p_quantity is null or p_quantity < 1 then
    raise exception 'Reservation quantity must be positive';
  end if;

  perform 1 from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;

  select case when p_image_id is not null then 'photo'
              when v.inventory_mode = 'photo' or p.inventory_mode = 'photo' then 'photo'
              else 'traditional' end
  into v_mode
  from public.products p
  left join public.product_variants v on v.id = p_variant_id and v.product_id = p.id
  where p.id = p_product_id
  for update;
  if not found then raise exception 'Product not found'; end if;

  if v_mode = 'photo' then
    if p_variant_id is null or p_image_id is null then
      raise exception 'Photo inventory requires a variant and artwork';
    end if;
    perform 1 from public.product_variant_images i
    where i.id = p_image_id and i.variant_id = p_variant_id
    for update;
    if not found then raise exception 'Artwork does not belong to the selected variant'; end if;
    update public.product_variant_images
    set available_quantity = available_quantity - p_quantity
    where id = p_image_id and available_quantity >= p_quantity;
    get diagnostics v_updated = row_count;
  elsif p_image_id is not null then
    raise exception 'Artwork cannot be selected for traditional inventory';
  else
    if p_variant_id is not null then
      update public.product_variants
      set stock = stock - p_quantity, updated_at = now()
      where id = p_variant_id and product_id = p_product_id and inventory_mode = 'traditional' and stock >= p_quantity;
    else
      update public.products
      set stock = stock - p_quantity, updated_at = now()
      where id = p_product_id and inventory_mode = 'traditional' and stock >= p_quantity;
    end if;
    get diagnostics v_updated = row_count;
  end if;

  if v_updated <> 1 then raise exception 'Insufficient inventory'; end if;

  insert into public.inventory_reservations(order_id, order_item_id, product_id, variant_id, image_id, inventory_mode, quantity)
  values (p_order_id, p_order_item_id, p_product_id, p_variant_id, p_image_id, v_mode, p_quantity)
  on conflict (order_item_id) do update
  set quantity = excluded.quantity
  returning id into v_reservation_id;
  return v_reservation_id;
end;
$$;

create or replace function public.trinity_release_order_inventory(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_updated integer;
begin
  perform 1 from public.orders where id = p_order_id for update;
  for r in
    select * from public.inventory_reservations
    where order_id = p_order_id and status = 'reserved'
    order by id for update
  loop
    if r.inventory_mode = 'photo' then
      update public.product_variant_images
      set available_quantity = available_quantity + r.quantity
      where id = r.image_id;
    elsif r.variant_id is not null then
      update public.product_variants set stock = stock + r.quantity, updated_at = now() where id = r.variant_id;
    else
      update public.products set stock = stock + r.quantity, updated_at = now() where id = r.product_id;
    end if;
    get diagnostics v_updated = row_count;
    if v_updated <> 1 then raise exception 'Inventory release affected an unexpected row'; end if;
    update public.inventory_reservations
    set status = 'released', released_at = now()
    where id = r.id and status = 'reserved';
  end loop;
  return true;
end;
$$;

create or replace function public.trinity_consume_order_inventory(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_status text;
begin
  select stock_reservation_status into v_order_status
  from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if v_order_status = 'consumed' then return false; end if;
  if v_order_status = 'released' then raise exception 'Released order cannot be consumed'; end if;
  update public.inventory_reservations
  set status = 'consumed', consumed_at = now()
  where order_id = p_order_id and status = 'reserved';
  return true;
end;
$$;

create or replace function public.create_stripe_pending_order(customer jsonb, items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  customer_id uuid;
  order_id uuid;
  order_number text;
  subtotal numeric(10,2) := 0;
  item jsonb;
  product_row public.products%rowtype;
  variant_row public.product_variants%rowtype;
  image_row public.product_variant_images%rowtype;
  quantity integer;
  image_id uuid;
  variant_id uuid;
  line_total numeric(10,2);
  order_row public.orders%rowtype;
  item_id uuid;
begin
  if customer is null or jsonb_typeof(customer) <> 'object' or jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then raise exception 'Invalid checkout payload'; end if;
  insert into public.customers(name, email, phone)
  values (trim(customer->>'name'), nullif(trim(customer->>'email'), ''), trim(customer->>'phone'))
  returning id into customer_id;
  order_number := 'TRN-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.orders(order_number, customer_id, customer_name, customer_phone, customer_email, country, governorate, city, address, payment_provider, payment_status, status, stock_reservation_status)
  values (order_number, customer_id, trim(customer->>'name'), trim(customer->>'phone'), nullif(trim(customer->>'email'), ''), trim(customer->>'country'), trim(customer->>'governorate'), trim(customer->>'city'), trim(customer->>'address'), 'stripe', 'pending', 'pending', 'reserved')
  returning id into order_id;

  for item in select * from jsonb_array_elements(items) loop
    quantity := coalesce((item->>'quantity')::integer, 0);
    if quantity < 1 or quantity > 99 then raise exception 'Invalid quantity'; end if;
    variant_id := nullif(item->>'variant_id', '')::uuid;
    image_id := nullif(item->>'image_id', '')::uuid;
    select * into product_row from public.products where id = (item->>'id')::uuid and is_published for update;
    if not found then raise exception 'Product is unavailable'; end if;
    if variant_id is not null then
      select * into variant_row from public.product_variants where id = variant_id and product_id = product_row.id for update;
      if not found then raise exception 'Selected variant is invalid'; end if;
      line_total := variant_row.price * quantity;
      if image_id is not null then
        select * into image_row from public.product_variant_images where id = image_id and variant_id = variant_id;
        if not found then raise exception 'Selected artwork is invalid'; end if;
      end if;
      insert into public.order_items(order_id, product_id, variant_id, image_id, product_name, variant_name, product_image, unit_price, quantity, line_total, length, width, height, weight)
      values (order_id, product_row.id, variant_row.id, image_id, product_row.name, variant_row.name, coalesce(image_row.image_url, product_row.image_url), variant_row.price, quantity, line_total, variant_row.length, variant_row.width, variant_row.height, variant_row.weight)
      returning id into item_id;
      perform public.trinity_reserve_inventory(order_id, item_id, product_row.id, variant_row.id, image_id, quantity);
    else
      line_total := product_row.price * quantity;
      insert into public.order_items(order_id, product_id, product_name, product_image, unit_price, quantity, line_total)
      values (order_id, product_row.id, product_row.name, product_row.image_url, product_row.price, quantity, line_total)
      returning id into item_id;
      perform public.trinity_reserve_inventory(order_id, item_id, product_row.id, null, null, quantity);
    end if;
    subtotal := subtotal + line_total;
  end loop;
  update public.orders set subtotal = subtotal, total = subtotal where id = order_id returning * into order_row;
  return jsonb_build_object('order', to_jsonb(order_row), 'items', coalesce((select jsonb_agg(to_jsonb(oi)) from public.order_items oi where oi.order_id = order_id), '[]'::jsonb));
end;
$$;

create or replace function public.complete_stripe_payment(p_order_id uuid, checkout_session_id text, payment_intent_id text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  order_row public.orders%rowtype;
begin
  select * into order_row from public.orders where id = p_order_id for update;
  if not found then raise exception 'Stripe order not found'; end if;
  if checkout_session_id is null or checkout_session_id !~ '^cs_[A-Za-z0-9_]+$'
     or payment_intent_id is null or payment_intent_id !~ '^pi_[A-Za-z0-9_]+$' then
    raise exception 'Valid Stripe checkout session and payment intent are required';
  end if;
  if order_row.stripe_checkout_session_id is not null
     and order_row.stripe_checkout_session_id <> checkout_session_id then
    raise exception 'Stripe checkout session does not match order';
  end if;
  if order_row.stripe_payment_intent_id is not null
     and order_row.stripe_payment_intent_id <> payment_intent_id then
    raise exception 'Stripe payment intent does not match order';
  end if;
  if order_row.payment_status = 'paid' and order_row.stock_reservation_status = 'consumed' then return false; end if;
  if order_row.stock_reservation_status = 'released' or order_row.payment_status = 'failed' then return false; end if;
  perform public.trinity_consume_order_inventory(p_order_id);
  update public.orders set payment_status = 'paid', status = 'confirmed', stock_reservation_status = 'consumed', stripe_checkout_session_id = coalesce(checkout_session_id, stripe_checkout_session_id), stripe_payment_intent_id = coalesce(payment_intent_id, stripe_payment_intent_id), updated_at = now() where id = p_order_id;
  return true;
end;
$$;

create or replace function public.release_stripe_stock(p_order_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  order_row public.orders%rowtype;
begin
  select * into order_row from public.orders where id = p_order_id for update;
  if not found then raise exception 'Stripe order not found'; end if;
  if order_row.payment_status = 'paid' or order_row.stock_reservation_status = 'consumed' then return false; end if;
  if order_row.stock_reservation_status <> 'reserved' then return false; end if;
  perform public.trinity_release_order_inventory(p_order_id);
  update public.orders set stock_reservation_status = 'released', payment_status = 'failed', updated_at = now() where id = p_order_id;
  return true;
end;
$$;

revoke all on function public.trinity_reserve_inventory(uuid, uuid, uuid, uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.trinity_release_order_inventory(uuid) from public, anon, authenticated;
revoke all on function public.trinity_consume_order_inventory(uuid) from public, anon, authenticated;
revoke all on function public.create_stripe_pending_order(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.complete_stripe_payment(uuid, text, text) from public, anon, authenticated;
revoke all on function public.release_stripe_stock(uuid) from public, anon, authenticated;
grant execute on function public.trinity_reserve_inventory(uuid, uuid, uuid, uuid, uuid, integer) to service_role;
grant execute on function public.trinity_release_order_inventory(uuid) to service_role;
grant execute on function public.trinity_consume_order_inventory(uuid) to service_role;
grant execute on function public.create_stripe_pending_order(jsonb, jsonb) to service_role;
grant execute on function public.complete_stripe_payment(uuid, text, text) to service_role;
grant execute on function public.release_stripe_stock(uuid) to service_role;

create or replace function public.create_checkout_order(customer jsonb, items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  customer_id uuid;
  order_id uuid;
  order_number text;
  subtotal numeric(10,2) := 0;
  item jsonb;
  product_row public.products%rowtype;
  variant_row public.product_variants%rowtype;
  image_row public.product_variant_images%rowtype;
  quantity integer;
  variant_id uuid;
  image_id uuid;
  line_total numeric(10,2);
  order_row public.orders%rowtype;
  item_id uuid;
begin
  if customer is null or jsonb_typeof(customer) <> 'object' or jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then raise exception 'Invalid checkout payload'; end if;
  insert into public.customers(name, email, phone)
  values (trim(customer->>'name'), nullif(trim(customer->>'email'), ''), trim(customer->>'phone'))
  returning id into customer_id;
  order_number := 'TRN-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.orders(order_number, customer_id, customer_name, customer_phone, customer_email, country, governorate, city, address, payment_status, status, stock_reservation_status)
  values (order_number, customer_id, trim(customer->>'name'), trim(customer->>'phone'), nullif(trim(customer->>'email'), ''), trim(customer->>'country'), trim(customer->>'governorate'), trim(customer->>'city'), trim(customer->>'address'), 'paid', 'confirmed', 'reserved')
  returning id into order_id;
  for item in select * from jsonb_array_elements(items) loop
    quantity := coalesce((item->>'quantity')::integer, 0);
    if quantity < 1 or quantity > 99 then raise exception 'Invalid quantity'; end if;
    variant_id := nullif(item->>'variant_id', '')::uuid;
    image_id := nullif(item->>'image_id', '')::uuid;
    select * into product_row from public.products where id = (item->>'id')::uuid and is_published for update;
    if not found then raise exception 'Product is unavailable'; end if;
    if variant_id is not null then
      select * into variant_row from public.product_variants where id = variant_id and product_id = product_row.id for update;
      if not found then raise exception 'Selected variant is invalid'; end if;
      if image_id is not null then
        select * into image_row from public.product_variant_images where id = image_id and variant_id = variant_id;
        if not found then raise exception 'Selected artwork is invalid'; end if;
      end if;
      line_total := variant_row.price * quantity;
      insert into public.order_items(order_id, product_id, variant_id, image_id, product_name, variant_name, product_image, unit_price, quantity, line_total)
      values (order_id, product_row.id, variant_row.id, image_id, product_row.name, variant_row.name, coalesce(image_row.image_url, product_row.image_url), variant_row.price, quantity, line_total)
      returning id into item_id;
      perform public.trinity_reserve_inventory(order_id, item_id, product_row.id, variant_row.id, image_id, quantity);
    else
      line_total := product_row.price * quantity;
      insert into public.order_items(order_id, product_id, product_name, product_image, unit_price, quantity, line_total)
      values (order_id, product_row.id, product_row.name, product_row.image_url, product_row.price, quantity, line_total)
      returning id into item_id;
      perform public.trinity_reserve_inventory(order_id, item_id, product_row.id, null, null, quantity);
    end if;
    subtotal := subtotal + line_total;
  end loop;
  perform public.trinity_consume_order_inventory(order_id);
  update public.orders set subtotal = subtotal, total = subtotal, stock_reservation_status = 'consumed' where id = order_id returning * into order_row;
  return jsonb_build_object('order', to_jsonb(order_row), 'items', coalesce((select jsonb_agg(to_jsonb(oi)) from public.order_items oi where oi.order_id = order_id), '[]'::jsonb));
end;
$$;

revoke all on function public.create_checkout_order(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_checkout_order(jsonb, jsonb) to service_role;
