-- Add the workspace roles used by the admin user-management feature.
-- Existing roles remain valid and preserve current authorization behavior.
alter table public.admin_users drop constraint if exists admin_users_role_check;
alter table public.admin_users add constraint admin_users_role_check
  check (role in ('super_admin','admin','content_manager','order_manager','product_manager','editor','viewer'));
