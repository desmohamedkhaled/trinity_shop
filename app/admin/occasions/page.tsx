"use client";

import { useEffect, useRef, useState } from "react";

interface Occasion {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  image_url: string | null;
  sort_order: number;
  is_published: boolean;
}

type OccasionForm = Omit<Occasion, "id">;

const blank: OccasionForm = {
  slug: "",
  name: "",
  subtitle: "",
  image_url: "",
  sort_order: 0,
  is_published: true,
};

export default function AdminOccasionsPage() {
  const [rows, setRows] = useState<Occasion[]>([]);
  const [form, setForm] = useState<OccasionForm>(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/occasions", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load occasions");
      setRows(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load occasions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function start(item?: Occasion) {
    setEditing(item?.id || null);
    setForm(item ? { slug: item.slug, name: item.name, subtitle: item.subtitle || "", image_url: item.image_url || "", sort_order: item.sort_order, is_published: item.is_published } : { ...blank });
    setOpen(true);
    setError("");
  }

  async function uploadImage(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Choose a common image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Images must be 8MB or smaller.");
      return;
    }

    setUploading(true);
    setError("");
    const data = new FormData();
    data.append("file", file);
    data.append("folder", "occasions");
    try {
      const response = await fetch("/api/admin/upload", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not upload image");
      setForm((current) => ({ ...current, image_url: result.url }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving || uploading) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(editing ? `/api/admin/occasions/${editing}` : "/api/admin/occasions", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save occasion");
      setOpen(false);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save occasion");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this occasion?")) return;
    const response = await fetch(`/api/admin/occasions/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error || "Could not delete occasion");
      return;
    }
    await load();
  }

  return (
    <div className="p-6 md:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm text-black/45">Store</p><h1 className="text-4xl font-black">Occasions</h1><p className="mt-2 text-sm text-black/50">Manage the real occasions used by the storefront.</p></div>
        <button onClick={() => start()} className="rounded-xl bg-[#083b68] px-5 py-3 text-sm font-bold text-white">Add occasion</button>
      </div>
      {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      <div className="mt-8 overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#f5f6f7]"><tr><th className="p-4">Occasion</th><th>Slug</th><th>Order</th><th>Status</th><th /></tr></thead><tbody>
          {loading ? <tr><td colSpan={5} className="p-10 text-center text-black/50">Loading occasions...</td></tr> : rows.length === 0 ? <tr><td colSpan={5} className="p-10 text-center text-black/50">No occasions configured yet.</td></tr> : rows.map((item) => <tr key={item.id} className="border-t"><td className="p-4"><b>{item.name}</b><div className="text-xs text-black/45">{item.subtitle || "No subtitle"}</div></td><td>{item.slug}</td><td>{item.sort_order}</td><td>{item.is_published ? "Published" : "Draft"}</td><td className="p-4 text-right"><button onClick={() => start(item)} className="mr-3 font-bold text-[#1267a8]">Edit</button><button onClick={() => remove(item.id)} className="font-bold text-red-700">Delete</button></td></tr>)}
        </tbody></table>
      </div>
      {open && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/40 p-5"><form onSubmit={save} className="my-5 w-full max-w-lg rounded-3xl bg-[#fffaf3] p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><h2 className="display-font text-3xl">{editing ? "Edit occasion" : "Add occasion"}</h2><button type="button" onClick={() => setOpen(false)} aria-label="Close">×</button></div><div className="mt-5 grid gap-3"><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Name" className="rounded-xl border p-3" /><input required value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} placeholder="Slug" className="rounded-xl border p-3" /><input value={form.subtitle || ""} onChange={(event) => setForm({ ...form, subtitle: event.target.value })} placeholder="Subtitle" className="rounded-xl border p-3" /><label className="grid gap-2 text-sm font-bold">Occasion image<input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadImage(file); }} disabled={uploading || saving} className="block w-full rounded-xl border border-dashed border-[#2479a8] bg-white p-3 text-sm" />{uploading && <span className="font-normal text-[#2479a8]">Uploading image...</span>}</label>{form.image_url && <div className="overflow-hidden rounded-2xl border bg-white"><img src={form.image_url} alt="Occasion preview" className="h-48 w-full object-cover" /></div>}<label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.is_published} onChange={(event) => setForm({ ...form, is_published: event.target.checked })} /> Published</label><label className="grid gap-2 text-sm font-bold">Sort order<input type="number" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: Number(event.target.value) })} className="rounded-xl border p-3" /></label></div><button disabled={saving || uploading} className="mt-6 w-full rounded-xl bg-[#083b68] px-5 py-3 font-bold text-white disabled:opacity-50">{saving ? "Saving..." : uploading ? "Uploading..." : "Save occasion"}</button></form></div>}
    </div>
  );
}
