import { NextResponse } from "next/server";
import { ADMIN_PERMISSIONS, defaultPermissionsForRole, requirePermission, serviceSupabase, type AdminPermission, type AdminRole } from "@/lib/admin";

const roles: AdminRole[] = ["super_admin", "admin", "product_manager", "order_manager", "content_manager", "editor", "viewer"];

function isRole(value: unknown): value is AdminRole {
  return typeof value === "string" && roles.includes(value as AdminRole);
}

function requiredUserPermissions(body: Record<string, unknown>): AdminPermission[] {
  const permissions = new Set<AdminPermission>();

  if (Object.prototype.hasOwnProperty.call(body, "permissions")) {
    permissions.add("users.permissions");
  }
  if (Object.prototype.hasOwnProperty.call(body, "is_active")) {
    permissions.add("users.deactivate");
  }
  if (Object.prototype.hasOwnProperty.call(body, "role")) {
    permissions.add("users.update");
  }

  return Array.from(permissions);
}

async function requireUsersPermission(permission: "users.read" | "users.create" | "users.update" | "users.deactivate" | "users.permissions") {
  const access = await requirePermission(permission);
  if (access.response) return access.response;
  const service = serviceSupabase();
  if (!access.supabase || !service) return NextResponse.json({ error: "Service unavailable." }, { status: 500 });
  return { ...access, service };
}

export async function GET() {
  const result = await requireUsersPermission("users.read");
  if (result instanceof NextResponse) return result;

  const { data, error } = await result.service
    .from("admin_users")
    .select("id,email,role,is_active,created_at,admin_user_permissions(permission_key)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const users = (data ?? []).map((user) => ({
    ...user,
    default_permissions: defaultPermissionsForRole(user.role),
    custom_permissions: Array.from(new Set((user.admin_user_permissions ?? []).map((grant) => grant.permission_key))).filter((permission) => !defaultPermissionsForRole(user.role).includes(permission)),
  }));
  return NextResponse.json({ users, available_permissions: ADMIN_PERMISSIONS });
}

export async function POST(request: Request) {
  const result = await requireUsersPermission("users.create");
  if (result instanceof NextResponse) return result;

  const body = await request.json();
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = body.role;

  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  if (!isRole(role)) return NextResponse.json({ error: "Choose a valid workspace role." }, { status: 422 });
  if (role === "super_admin" && result.admin.role !== "super_admin") return NextResponse.json({ error: "Only a Super Admin can create another Super Admin." }, { status: 403 });

  const { data: existing } = await result.service.from("admin_users").select("id").eq("email", email).maybeSingle();
  if (existing) return NextResponse.json({ error: "An admin user with that email already exists." }, { status: 409 });

  const { data: created, error: authError } = await result.service.auth.admin.createUser({ email, password, email_confirm: true });
  if (authError || !created.user) return NextResponse.json({ error: authError?.message || "Could not create the Auth user." }, { status: 400 });

  const { data: admin, error: adminError } = await result.service
    .from("admin_users")
    .insert({ id: created.user.id, email, role, is_active: true })
    .select("id,email,role,is_active,created_at,admin_user_permissions(permission_key)")
    .single();

  if (adminError) {
    await result.service.auth.admin.deleteUser(created.user.id);
    const message = adminError.code === "23505" ? "An admin user with that email already exists." : adminError.message;
    return NextResponse.json({ error: message }, { status: adminError.code === "23505" ? 409 : 400 });
  }

  return NextResponse.json({
    ...admin,
    default_permissions: defaultPermissionsForRole(admin.role),
    custom_permissions: Array.from(new Set((admin.admin_user_permissions ?? []).map((grant) => grant.permission_key))).filter((permission) => !defaultPermissionsForRole(admin.role).includes(permission)),
  }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const requiredPermissions = requiredUserPermissions(body);

  if (!requiredPermissions.length) {
    return NextResponse.json({ error: "No user changes supplied." }, { status: 400 });
  }

  const permissionResults = [] as Awaited<ReturnType<typeof requirePermission>>[];
  for (const permission of requiredPermissions) {
    const access = await requirePermission(permission);
    if (access.response) return access.response;
    permissionResults.push(access);
  }

  const result = permissionResults[0];
  if (!result || !result.supabase || !result.user || !result.admin) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const service = serviceSupabase();
  if (!service) return NextResponse.json({ error: "Service unavailable." }, { status: 500 });
  const effectiveContext = { ...result, service };

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "User id is required." }, { status: 400 });
  if (id === result.user.id && body.is_active === false) return NextResponse.json({ error: "You cannot deactivate your own account." }, { status: 400 });

  const { data: target } = await effectiveContext.service.from("admin_users").select("id,role,is_active").eq("id", id).maybeSingle();
  if (!target) return NextResponse.json({ error: "Admin user not found." }, { status: 404 });
  const { count: superAdminCount } = await effectiveContext.service.from("admin_users").select("id", { count: "exact", head: true }).eq("role", "super_admin").eq("is_active", true);
  if (target.role === "super_admin" && effectiveContext.admin.role !== "super_admin") return NextResponse.json({ error: "Only a Super Admin can modify a Super Admin." }, { status: 403 });
  if (target.role === "super_admin" && (body.is_active === false || body.role && body.role !== "super_admin") && (superAdminCount ?? 0) <= 1) return NextResponse.json({ error: "The final active Super Admin cannot be deactivated or demoted." }, { status: 409 });

  if (body.permissions !== undefined) {
    if (effectiveContext.admin.role !== "super_admin") return NextResponse.json({ error: "Only a Super Admin can manage custom permissions." }, { status: 403 });
    if (!Array.isArray(body.permissions) || body.permissions.some((value: unknown) => !ADMIN_PERMISSIONS.includes(value as AdminPermission))) return NextResponse.json({ error: "One or more permissions are invalid." }, { status: 422 });
    const customPermissions = Array.from(new Set(body.permissions as AdminPermission[])).filter((permission) => !defaultPermissionsForRole(target.role).includes(permission));
    const { error: deleteError } = await effectiveContext.service.from("admin_user_permissions").delete().eq("admin_user_id", id);
    if (deleteError) return NextResponse.json({ error: "Could not update custom permissions." }, { status: 500 });
    if (customPermissions.length) {
      const { error: insertError } = await effectiveContext.service.from("admin_user_permissions").insert(customPermissions.map((permissionKey) => ({ admin_user_id: id, permission_key: permissionKey })));
      if (insertError) return NextResponse.json({ error: "Could not update custom permissions." }, { status: 500 });
    }
  }

  const updates: Record<string, unknown> = {};
  if (body.is_active !== undefined) {
    if (typeof body.is_active !== "boolean") return NextResponse.json({ error: "Active status must be boolean." }, { status: 400 });
    updates.is_active = body.is_active;
  }
  if (body.role !== undefined) {
    if (!isRole(body.role)) return NextResponse.json({ error: "Choose a valid workspace role." }, { status: 422 });
    if (body.role === "super_admin" && effectiveContext.admin.role !== "super_admin") return NextResponse.json({ error: "Only a Super Admin can assign Super Admin." }, { status: 403 });
    updates.role = body.role;
  }
  if (!Object.keys(updates).length && body.permissions === undefined) return NextResponse.json({ error: "No user changes supplied." }, { status: 400 });

  const query = Object.keys(updates).length
    ? effectiveContext.service.from("admin_users").update(updates).eq("id", id)
    : effectiveContext.service.from("admin_users").select("*").eq("id", id);
  const { data, error } = await query.select("id,email,role,is_active,created_at,admin_user_permissions(permission_key)").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({
    ...data,
    default_permissions: defaultPermissionsForRole(data.role),
    custom_permissions: Array.from(new Set((data.admin_user_permissions ?? []).map((grant) => grant.permission_key))).filter((permission) => !defaultPermissionsForRole(data.role).includes(permission)),
  });
}