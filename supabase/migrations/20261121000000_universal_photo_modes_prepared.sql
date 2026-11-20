-- Prepared for owner approval. Do not apply to DEV or Production without approval.
-- This changes only the inventory mode flags; it does not redistribute stock,
-- change quantities, alter artwork assignments, or delete historical records.

update public.products
set inventory_mode = 'photo'
where inventory_mode is distinct from 'photo';

update public.product_variants
set inventory_mode = 'photo'
where inventory_mode is distinct from 'photo';
