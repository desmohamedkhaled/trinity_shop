-- Adds per-product booking eligibility and configurable deposit percentage.
-- Existing products remain ineligible and keep a 50% default for future use.

alter table public.products
  add column if not exists preorder_eligible boolean not null default false,
  add column if not exists deposit_percentage integer not null default 50;

alter table public.products
  drop constraint if exists products_deposit_percentage_check;
alter table public.products
  add constraint products_deposit_percentage_check
  check (deposit_percentage between 1 and 100);
