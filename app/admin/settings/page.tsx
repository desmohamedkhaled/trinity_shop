"use client";

import { useEffect, useState } from "react";
import { useAdminAccess } from "@/components/admin-access";

type PermissionKey = string;

type AdminUser = {
  id: string;
  email: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  default_permissions: PermissionKey[];
  custom_permissions: PermissionKey[];
};

export default function Settings() {
  const { access, refresh } = useAdminAccess();
  const [enabled, setEnabled] = useState(true);
  const [number, setNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [userSaving, setUserSaving] = useState(false);
  const [userSuccess, setUserSuccess] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"super_admin" | "admin" | "product_manager" | "order_manager" | "content_manager" | "editor" | "viewer">("editor");
  const [availablePermissions, setAvailablePermissions] = useState<PermissionKey[]>([]);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [customPermissions, setCustomPermissions] = useState<PermissionKey[]>([]);
  const [permissionsSaving, setPermissionsSaving] = useState(false);

  async function loadSettings() {
    try {
      const response = await fetch("/api/settings", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load settings");
      if (data.whatsapp_checkout_enabled !== undefined) setEnabled(Boolean(data.whatsapp_checkout_enabled));
      if (data.whatsapp_number !== undefined) setNumber(String(data.whatsapp_number || ""));
      if (data.phone_number !== undefined) setPhoneNumber(String(data.phone_number || ""));
    } catch (loadError) {
      setSettingsError(loadError instanceof Error ? loadError.message : "Could not load settings");
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "User management is available to super admins only.");
      setUsers(Array.isArray(data?.users) ? data.users : []);
      setAvailablePermissions(Array.isArray(data?.available_permissions) ? data.available_permissions : []);
    } catch (loadError) {
      setUsersError(loadError instanceof Error ? loadError.message : "Could not load admin users");
    } finally {
      setUsersLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
    loadUsers();
  }, []);

  async function saveSettings() {
    setSaving(true);
    setSaved(false);
    setSettingsError("");
    try {
      const response = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ whatsapp_checkout_enabled: enabled, whatsapp_number: number.replace(/\D/g, ""), phone_number: phoneNumber }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save settings");
      setSaved(true);
    } catch (saveError) {
      setSettingsError(saveError instanceof Error ? saveError.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  async function createUser(event: React.FormEvent) {
    event.preventDefault();
    setUserSaving(true);
    setUsersError("");
    setUserSuccess("");
    try {
      const response = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, role }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create user");
      setUsers((current) => [data, ...current]);
      setEmail("");
      setPassword("");
      setRole("editor");
      setUserSuccess("User created successfully.");
    } catch (createError) {
      setUsersError(createError instanceof Error ? createError.message : "Could not create user");
    } finally {
      setUserSaving(false);
    }
  }

  async function updateUser(user: AdminUser) {
    if (!confirm(`${user.is_active ? "Deactivate" : "Activate"} ${user.email || "this user"}?`)) return;
    setUsersError("");
    const response = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: user.id, is_active: !user.is_active }) });
    const data = await response.json();
    if (!response.ok) {
      setUsersError(data.error || "Could not update user");
      return;
    }
    setUsers((current) => current.map((item) => item.id === data.id ? data : item));
  }

  function editPermissions(user: AdminUser) {
    setEditingUser(user);
    setCustomPermissions(user.custom_permissions ?? []);
    setUsersError("");
    setUserSuccess("");
  }

  async function savePermissions() {
    if (!editingUser) return;
    setPermissionsSaving(true);
    setUsersError("");
    setUserSuccess("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingUser.id, permissions: customPermissions }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save custom permissions");
      setUsers((current) => current.map((user) => user.id === data.id ? data : user));
      setEditingUser(data);
      setCustomPermissions(data.custom_permissions ?? []);
      setUserSuccess("Custom permissions saved successfully.");
      refresh();
    } catch (saveError) {
      setUsersError(saveError instanceof Error ? saveError.message : "Could not save custom permissions");
    } finally {
      setPermissionsSaving(false);
    }
  }

  function toggleCustomPermission(permission: PermissionKey) {
    setCustomPermissions((current) => current.includes(permission)
      ? current.filter((item) => item !== permission)
      : [...current, permission]);
  }

  return (
    <div className="p-6 md:p-10">
      <p className="text-sm text-black/45">Store configuration</p>
      <h1 className="text-4xl font-black">Settings</h1>
      <p className="mt-2 max-w-2xl text-black/55">Manage checkout behavior and authorized workspace access.</p>
      {settingsError && <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{settingsError}</p>}

      <section className="mt-8 max-w-3xl rounded-3xl border bg-white p-6 md:p-8">
        <h2 className="font-bold">WhatsApp checkout</h2>
        <p className="mt-1 text-sm text-black/50">When enabled, customers are sent to WhatsApp with every item, quantity, and total.</p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-5"><div className="text-sm font-semibold">Checkout status</div><button disabled={loading || saving} onClick={() => setEnabled((value) => !value)} className={`relative h-8 w-14 rounded-full transition ${enabled ? "bg-[#1267a8]" : "bg-black/20"}`} aria-label="Toggle WhatsApp checkout"><span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${enabled ? "left-7" : "left-1"}`} /></button></div>
        <label className="mt-8 block text-sm font-bold">WhatsApp business number<span className="mt-1 block text-xs font-normal text-black/45">Use international format without + or spaces.</span><input value={number} onChange={(event) => setNumber(event.target.value)} placeholder="2010XXXXXXXX" className="mt-3 w-full rounded-xl border p-3" /></label>
        <div className="mt-7 flex flex-wrap items-center gap-4"><button disabled={saving} onClick={saveSettings} className="rounded-xl bg-[#083b68] px-5 py-3 font-bold text-white disabled:opacity-50">{saving ? "Saving..." : "Save settings"}</button>{saved && <span className="text-sm font-semibold text-green-700">Saved successfully</span>}</div>
        <label className="mt-8 block text-sm font-bold" htmlFor="store-phone-number">Phone Number<span className="mt-1 block text-xs font-normal text-black/45">Public store phone displayed on the Contact page.</span><input id="store-phone-number" type="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="+61 400 123 456" className="mt-3 w-full rounded-xl border p-3 outline-none focus:border-[#1267a8] focus:ring-2 focus:ring-[#1267a8]/20" /></label>
      </section>

      <section className="mt-8 max-w-4xl rounded-3xl border bg-white p-6 md:p-8">
        <h2 className="font-bold">User Management</h2>
        <p className="mt-1 text-sm text-black/50">Super admins can add workspace users and deactivate access without deleting their Auth account.</p>
        {usersError && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{usersError}</p>}
        {userSuccess && <p className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-700">{userSuccess}</p>}
        <form onSubmit={createUser} className="mt-6 grid gap-3 rounded-2xl bg-[#f5f6f7] p-4 md:grid-cols-[1.2fr_1fr_.8fr_auto] md:items-end"><label className="text-sm font-bold">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border bg-white p-3 font-normal" /></label><label className="text-sm font-bold">Password<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border bg-white p-3 font-normal" /></label><label className="text-sm font-bold">Role<select value={role} onChange={(event) => setRole(event.target.value as "super_admin" | "admin" | "product_manager" | "order_manager" | "content_manager" | "editor" | "viewer")} className="mt-2 w-full rounded-xl border bg-white p-3 font-normal"><option value="super_admin">Super Admin</option><option value="admin">Admin</option><option value="product_manager">Product Manager</option><option value="order_manager">Order Manager</option><option value="content_manager">Content Manager</option><option value="editor">Editor</option><option value="viewer">Viewer</option></select></label><button disabled={userSaving || usersLoading} className="rounded-xl bg-[#083b68] px-5 py-3 font-bold text-white disabled:opacity-50">{userSaving ? "Adding..." : "Add user"}</button></form>
        <div className="mt-6 grid gap-3">{usersLoading ? <p className="text-sm text-black/50">Loading users...</p> : users.length === 0 ? <p className="text-sm text-black/50">No workspace users found.</p> : users.map((user) => <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"><div className="min-w-0"><p className="break-all font-semibold">{user.email || "Unknown email"}</p><p className="mt-1 text-xs text-black/50">Joined {new Date(user.created_at).toLocaleDateString()} · {user.role === "editor" ? "Editor" : user.role === "viewer" ? "Viewer" : user.role}</p></div><div className="flex items-center gap-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${user.is_active ? "bg-green-100 text-green-800" : "bg-black/10 text-black/55"}`}>{user.is_active ? "Active" : "Inactive"}</span><button onClick={() => editPermissions(user)} className="text-sm font-bold text-[#1267a8]">Permissions</button><button onClick={() => updateUser(user)} className="text-sm font-bold text-[#1267a8]">{user.is_active ? "Deactivate" : "Activate"}</button></div></div>)}</div>
        {editingUser && access?.role === "super_admin" && <div className="mt-6 rounded-2xl border border-[#1267a8]/25 bg-[#f7fbff] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">Custom permissions</h3><p className="mt-1 break-all text-sm text-black/55">{editingUser.email || "Unknown email"} · {editingUser.role}</p></div><button onClick={() => setEditingUser(null)} className="text-sm font-bold text-black/55">Close</button></div><div className="mt-5 grid gap-4 md:grid-cols-2"><div><h4 className="text-sm font-bold">Role/default permissions</h4><div className="mt-2 flex flex-wrap gap-2">{editingUser.default_permissions.map((permission) => <span key={permission} className="rounded-full bg-black/10 px-3 py-1 text-xs font-semibold text-black/60">{permission}</span>)}</div></div><div><h4 className="text-sm font-bold">Custom/additive permissions</h4><div className="mt-2 grid gap-2">{availablePermissions.filter((permission) => !editingUser.default_permissions.includes(permission)).map((permission) => <label key={permission} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"><input type="checkbox" checked={customPermissions.includes(permission)} onChange={() => toggleCustomPermission(permission)} />{permission}</label>)}</div></div></div><div className="mt-5 flex items-center gap-4"><button disabled={permissionsSaving} onClick={savePermissions} className="rounded-xl bg-[#083b68] px-5 py-3 font-bold text-white disabled:opacity-50">{permissionsSaving ? "Saving..." : "Save custom permissions"}</button><span className="text-xs text-black/50">Only explicitly selected additive permissions are stored.</span></div></div>}
      </section>
    </div>
  );
}
