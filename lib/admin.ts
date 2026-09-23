import { serverSupabase } from './supabase';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export type AdminRole = 'super_admin' | 'admin' | 'content_manager' | 'order_manager' | 'product_manager' | 'editor' | 'viewer';
export type AdminPermission =
  | 'dashboard.read' | 'products.read' | 'products.create' | 'products.update' | 'products.delete'
  | 'inventory.read' | 'inventory.update' | 'orders.read' | 'orders.create' | 'orders.update' | 'orders.delete'
  | 'customers.read' | 'customers.update' | 'customers.delete' | 'requests.read' | 'requests.update' | 'requests.delete'
  | 'events.read' | 'events.create' | 'events.update' | 'events.delete' | 'occasions.read' | 'occasions.create' | 'occasions.update' | 'occasions.delete'
  | 'media.read' | 'media.upload' | 'media.delete' | 'pages.read' | 'pages.update' | 'gift_finder.read' | 'gift_finder.update'
  | 'gift_lists.read' | 'gift_lists.update' | 'gift_lists.delete' | 'settings.read' | 'settings.update'
  | 'users.read' | 'users.create' | 'users.update' | 'users.deactivate' | 'users.permissions';

export const ADMIN_PERMISSIONS = [
  'dashboard.read','products.read','products.create','products.update','products.delete','inventory.read','inventory.update',
  'orders.read','orders.create','orders.update','orders.delete','customers.read','customers.update','customers.delete',
  'requests.read','requests.update','requests.delete','events.read','events.create','events.update','events.delete',
  'occasions.read','occasions.create','occasions.update','occasions.delete','media.read','media.upload','media.delete',
  'pages.read','pages.update','gift_finder.read','gift_finder.update','gift_lists.read','gift_lists.update','gift_lists.delete',
  'settings.read','settings.update','users.read','users.create','users.update','users.deactivate','users.permissions',
] as const satisfies readonly AdminPermission[];

const ROLE_DEFAULTS: Record<AdminRole, readonly AdminPermission[]> = {
  super_admin: ADMIN_PERMISSIONS,
  admin: ADMIN_PERMISSIONS.filter((permission) => !permission.startsWith('users.')),
  product_manager: ['dashboard.read','products.read','products.create','products.update','products.delete','inventory.read','inventory.update','media.read','media.upload'],
  order_manager: ['dashboard.read','orders.read','orders.create','orders.update','orders.delete','requests.read','requests.update','requests.delete','customers.read','customers.update','gift_lists.read','gift_lists.update','gift_lists.delete','gift_finder.read'],
  content_manager: ['dashboard.read','pages.read','pages.update','occasions.read','occasions.create','occasions.update','occasions.delete','events.read','events.create','events.update','events.delete','media.read','media.upload','media.delete','gift_finder.read','gift_finder.update'],
  editor: ['dashboard.read'],
  viewer: ADMIN_PERMISSIONS.filter((permission) => permission.endsWith('.read')),
};

export function defaultPermissionsForRole(role: string) {
  return [...(ROLE_DEFAULTS[role as AdminRole] ?? [])];
}

export function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function requireAdmin() {
  const supabase = await serverSupabase();

  if (!supabase) {
    return { supabase: null, user: null, admin: null };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, admin: null };

  const { data: admin } = await supabase
    .from('admin_users')
    .select('id,email,role,is_active')
    .eq('id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!admin) return { supabase, user, admin: null };
  const { data: grants } = await supabase.from('admin_user_permissions').select('permission_key').eq('admin_user_id', user.id);
  return { supabase, user, admin: { ...admin, permissions: (grants ?? []).map((grant) => grant.permission_key as AdminPermission) } };
}

export function hasPermission(admin: { role: string; permissions?: AdminPermission[] } | null, permission: AdminPermission) {
  if (!admin) return false;
  if (admin.role === 'super_admin') return true;
  const defaults = ROLE_DEFAULTS[admin.role as AdminRole] ?? [];
  return defaults.includes(permission) || Boolean(admin.permissions?.includes(permission));
}

export function permissionsForAdmin(admin: { role: string; permissions?: AdminPermission[] } | null) {
  if (!admin) return [] as AdminPermission[];
  return Array.from(new Set([...defaultPermissionsForRole(admin.role), ...(admin.permissions ?? [])]));
}

export async function requirePermission(permission: AdminPermission) {
  const result = await requireAdmin();
  if (!result.user) return { ...result, authorized: false, response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  if (!result.admin || !hasPermission(result.admin, permission)) return { ...result, authorized: false, response: NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 }) };
  return { ...result, authorized: true, response: null };
}

export async function currentAdminAccess() {
  const result = await requireAdmin();
  return { ...result, permissions: permissionsForAdmin(result.admin) };
}

export async function requireAdminRole(roles: AdminRole[]) {
  const result = await requireAdmin();
  const role = result.admin?.role as AdminRole | undefined;
  const roleAllowed = Boolean(role && roles.includes(role));
  if (!result.admin || !roleAllowed) {
    return { ...result, admin: null };
  }
  return result;
}
