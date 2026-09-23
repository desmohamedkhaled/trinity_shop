-- Add RLS policies for gift_questions and gift_options
alter table public.gift_questions enable row level security;
create policy "public can read active gift questions" on public.gift_questions
  for select using (is_active = true);
create policy "admins manage gift questions" on public.gift_questions
  for all using (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active = true))
  with check (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active = true));

alter table public.gift_options enable row level security;
create policy "public can read gift options" on public.gift_options
  for select using (exists (select 1 from public.gift_questions gq where gq.id = gift_options.question_id and gq.is_active = true));
create policy "admins manage gift options" on public.gift_options
  for all using (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active = true))
  with check (exists (select 1 from public.admin_users a where a.id = auth.uid() and a.is_active = true));
