-- Idempotent repair for projects where the initial checkout migration was only partially applied.
alter table public.products add column if not exists occasion text[] not null default '{}';
alter table public.products add column if not exists gift_for text[] not null default '{}';

alter table public.requests add column if not exists request_type text not null default 'gift_request';
alter table public.requests add column if not exists gift_for text;
alter table public.requests add column if not exists budget_min numeric(10,2);
alter table public.requests add column if not exists budget_max numeric(10,2);
alter table public.requests add column if not exists gift_category text;
alter table public.requests add column if not exists preferences text;
alter table public.requests add column if not exists recipient text;
alter table public.requests add column if not exists updated_at timestamptz not null default now();

create table if not exists public.request_recommendations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  admin_notes text,
  created_at timestamptz not null default now(),
  unique(request_id, product_id)
);
alter table public.request_recommendations enable row level security;
drop policy if exists "admins manage request recommendations" on public.request_recommendations;
create policy "admins manage request recommendations" on public.request_recommendations for all
  using (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active = true))
  with check (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active = true));

create or replace function public.create_checkout_order(customer jsonb, items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare customer_id uuid; order_id uuid; order_number text; subtotal numeric(10,2) := 0; item jsonb;
  product_row public.products%rowtype; quantity integer; line_total numeric(10,2); order_row public.orders%rowtype;
begin
  if coalesce(trim(customer->>'name'), '') = '' or coalesce(trim(customer->>'phone'), '') = '' or coalesce(trim(customer->>'country'), '') = '' or coalesce(trim(customer->>'governorate'), '') = '' or coalesce(trim(customer->>'city'), '') = '' or coalesce(trim(customer->>'address'), '') = '' then raise exception 'Required customer details are missing'; end if;
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then raise exception 'Cart is empty'; end if;
  insert into public.customers(name,email,phone) values (trim(customer->>'name'),nullif(trim(customer->>'email'),''),trim(customer->>'phone')) returning id into customer_id;
  order_number := 'TRN-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.orders(order_number,customer_id,customer_name,customer_phone,customer_email,country,governorate,city,address) values (order_number,customer_id,trim(customer->>'name'),trim(customer->>'phone'),nullif(trim(customer->>'email'),''),trim(customer->>'country'),trim(customer->>'governorate'),trim(customer->>'city'),trim(customer->>'address')) returning id into order_id;
  for item in select * from jsonb_array_elements(items) loop
    quantity := (item->>'quantity')::integer;
    if quantity < 1 or quantity > 99 then raise exception 'Invalid quantity'; end if;
    select * into product_row from public.products where id = (item->>'id')::uuid and is_published = true for update;
    if not found then raise exception 'Product is unavailable'; end if;
    if product_row.stock < quantity then raise exception 'Only % items are available for %', product_row.stock, product_row.name; end if;
    line_total := product_row.price * quantity; subtotal := subtotal + line_total;
    insert into public.order_items(order_id,product_id,product_name,product_image,unit_price,quantity,line_total) values (order_id,product_row.id,product_row.name,product_row.image_url,product_row.price,quantity,line_total);
    update public.products set stock = stock - quantity, updated_at = now() where id = product_row.id;
  end loop;
  update public.orders set subtotal = subtotal,total = subtotal,updated_at = now() where id = order_id returning * into order_row;
  return jsonb_build_object('order',to_jsonb(order_row),'items',coalesce((select jsonb_agg(to_jsonb(oi)) from public.order_items oi where oi.order_id = order_id),'[]'::jsonb));
end;
$$;
revoke all on function public.create_checkout_order(jsonb,jsonb) from public;
grant execute on function public.create_checkout_order(jsonb,jsonb) to service_role;
