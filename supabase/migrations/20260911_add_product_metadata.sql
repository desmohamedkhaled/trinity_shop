-- Add occasion and gift_for as text arrays to products table
alter table public.products add column if not exists occasion text[] not null default '{}';
alter table public.products add column if not exists gift_for text[] not null default '{}';
