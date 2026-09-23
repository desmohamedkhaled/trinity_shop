-- Feature 4.7: initialize the public store phone setting.
-- Reuses the existing site_settings key/value table and RLS policies.
insert into public.site_settings(key, value)
values ('phone_number', '""')
on conflict (key) do nothing;
