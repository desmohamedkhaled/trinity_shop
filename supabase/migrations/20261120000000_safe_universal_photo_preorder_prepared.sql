-- Prepared locally for owner review. Not applied to DEV or Production.
-- This migration adds optional master-data and pre-order fields only.
-- It deliberately performs no stock conversion and no stock redistribution.

alter table public.products
  add column if not exists sku text,
  add column if not exists arabic_title text,
  add column if not exists preorder_eligible boolean not null default false,
  add column if not exists deposit_percentage integer not null default 50;

alter table public.products
  drop constraint if exists products_deposit_percentage_check;
alter table public.products
  add constraint products_deposit_percentage_check
  check (deposit_percentage between 1 and 100);

create unique index if not exists products_sku_unique_idx
  on public.products(sku)
  where sku is not null;

alter table public.order_items
  add column if not exists is_deposit boolean not null default false,
  add column if not exists deposit_percentage integer not null default 0,
  add column if not exists remaining_balance numeric(10,2) not null default 0,
  add column if not exists deposit_paid_at timestamptz;

alter table public.orders
  add column if not exists preorder_status text,
  add column if not exists balance_payment_status text not null default 'not_required',
  add column if not exists balance_due_at timestamptz,
  add column if not exists balance_paid_at timestamptz,
  add column if not exists balance_payment_token_hash text,
  add column if not exists balance_payment_token_expires_at timestamptz;

alter table public.orders
  drop constraint if exists orders_preorder_status_check;
alter table public.orders
  add constraint orders_preorder_status_check
  check (preorder_status is null or preorder_status in ('deposit_pending','deposit_paid','stock_received','balance_paid','cancelled'));

alter table public.orders
  drop constraint if exists orders_balance_payment_status_check;
alter table public.orders
  add constraint orders_balance_payment_status_check
  check (balance_payment_status in ('not_required','pending','paid','cancelled'));

-- Canonical source-image identity, preserving the existing image_url relationship.
alter table public.product_variant_images
  add column if not exists image_id uuid references public.product_images(id) on delete set null;

create unique index if not exists product_variant_images_variant_image_id_unique
  on public.product_variant_images(variant_id, image_id)
  where image_id is not null;

-- Owner-approved follow-up step: convert only the mode flag after the DEV
-- inventory audit confirms existing quantities are already photo allocations.
-- This does not alter stock, assignments, or artwork URLs.
-- update public.products set inventory_mode = 'photo' where inventory_mode <> 'photo';
-- update public.product_variants set inventory_mode = 'photo' where inventory_mode <> 'photo';
