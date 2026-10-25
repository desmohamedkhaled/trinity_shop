-- Existing assignments remain unavailable until their image quantities are configured.
alter table public.product_variant_images
  add column if not exists available_quantity integer not null default 0
    check (available_quantity >= 0);
