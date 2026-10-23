-- Durable Stripe event idempotency for DEV and future production rollout.

create table if not exists public.stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  status text not null default 'processing'
    check (status in ('processing', 'processed', 'failed')),
  attempts integer not null default 1 check (attempts > 0),
  last_error text,
  claimed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.stripe_webhook_events
  add column if not exists claimed_at timestamptz not null default now();

create index if not exists idx_stripe_webhook_events_status
  on public.stripe_webhook_events(status);

alter table public.stripe_webhook_events enable row level security;
