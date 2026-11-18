"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Edit, Eye, Plus, Search, Trash2, Upload, X } from "lucide-react";

const blank = {
  id: "",
  title: "",
  image_url: "",
  event_date: "",
  start_time: "",
  end_time: "",
  description: "",
  status: "draft",
  location: "",
  button_text: "",
  button_url: "",
  is_featured: false,
  display_order: 0,
};

export default function AdminEventsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>(blank);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/events", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load events");
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load events");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter((row) => {
    const term = search.toLowerCase();
    return (!term || `${row.title} ${row.location || ""} ${row.description || ""}`.toLowerCase().includes(term));
  }), [rows, search]);

  function startCreate() {
    setEditingId(null);
    setForm(blank);
    setError("");
    setSuccess("");
    setOpen(true);
  }

  function startEdit(row: any) {
    setEditingId(row.id);
    setForm({
      ...blank,
      ...row,
      image_url: row.image_url || "",
      event_date: row.event_date || "",
      start_time: row.start_time || "",
      end_time: row.end_time || "",
      status: row.status || "draft",
      is_featured: Boolean(row.is_featured),
      display_order: Number(row.display_order || 0),
    });
    setError("");
    setSuccess("");
    setOpen(true);
  }

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Maximum image size is 8MB");
      return;
    }

    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "events");

    try {
      const response = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");
      setForm((current) => ({ ...current, image_url: data.url }));
      setSuccess("Image uploaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.title?.trim()) return setError("Event name is required.");
    if (!form.image_url?.trim()) return setError("Event image is required.");
    if (!form.event_date) return setError("Event date is required.");
    if (!form.start_time) return setError("Start time is required.");
    if (!form.description?.trim()) return setError("Description is required.");
    if (form.end_time && form.start_time && form.end_time < form.start_time) return setError("End time cannot be earlier than start time.");
    if (form.button_url && !/^https?:\/\//i.test(String(form.button_url))) return setError("Button URL must be a valid URL.");

    if (["draft", "published", "archived"].indexOf(form.status) === -1) return setError("Choose a valid status.");

    setSaving(true);
    try {
      const response = await fetch(editingId ? `/api/admin/events/${editingId}` : "/api/admin/events", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save event");

      setSuccess(editingId ? "Event updated" : "Event created");
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save event");
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    if (!confirm("Delete this event?")) return;
    try {
      const response = await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Delete failed");
      setSuccess("Event deleted");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function publishToggle(row: any) {
    const nextStatus = row.status === "published" ? "draft" : "published";
    try {
      const response = await fetch(`/api/admin/events/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update event");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update event");
    }
  }

  return (
    <div className="p-6 md:p-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-black/45">Administration</p>
          <h1 className="text-4xl font-black text-[#083b68]">Events</h1>
        </div>
        <button onClick={startCreate} className="inline-flex items-center gap-2 rounded-xl bg-[#083b68] px-5 py-3 text-sm font-bold text-white">
          <Plus size={17} /> Create Event
        </button>
      </div>

      {error && <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {success && <p className="mt-5 rounded-xl bg-green-50 p-3 text-sm text-green-700">{success}</p>}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black/50" size={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white py-3 pl-11 pr-4 text-sm" placeholder="Search events" />
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-[#f5f6f7]">
            <tr>
              <th className="p-4">Image</th>
              <th className="p-4">Event</th>
              <th className="p-4">Date</th>
              <th className="p-4">Start</th>
              <th className="p-4">End</th>
              <th className="p-4">Status</th>
              <th className="p-4">Featured</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={8} className="p-10 text-center text-black/50">Loading events...</td></tr> : filtered.length === 0 ? <tr><td colSpan={8} className="p-12 text-center text-black/50">No events yet</td></tr> : filtered.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-4"><Image src={row.image_url} alt="" width={64} height={64} className="h-16 w-16 rounded-xl object-cover" /></td>
                <td className="p-4 font-bold text-[#083b68]">{row.title}</td>
                <td className="p-4">{row.event_date}</td>
                <td className="p-4">{row.start_time}</td>
                <td className="p-4">{row.end_time || "—"}</td>
                <td className="p-4"><span className="rounded-full bg-black/5 px-3 py-1 text-xs font-black uppercase">{row.status}</span></td>
                <td className="p-4"><span className="rounded-full px-3 py-1 text-xs font-black uppercase">{row.is_featured ? "Featured" : "Standard"}</span></td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(row)} className="rounded-lg p-2 hover:bg-black/5" aria-label="Edit"><Edit size={16} /></button>
                    <button onClick={() => publishToggle(row)} className="rounded-lg p-2 hover:bg-black/5" aria-label="Toggle publish"><Eye size={16} /></button>
                    <button onClick={() => del(row.id)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label="Delete"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-[2rem] bg-[#fffdf8] p-7 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[.22em] text-[#b48d55]">Events</p>
                <h2 className="mt-2 text-3xl font-black text-[#083b68]">{editingId ? "Edit Event" : "Create Event"}</h2>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-black/5"><X size={20} /></button>
            </div>

            <form onSubmit={save} className="mt-8 grid gap-5">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-black text-black/70">
                  Event Name*
                  <input required className="rounded-xl border border-black/10 px-4 py-3" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </label>
                <label className="flex flex-col gap-2 text-sm font-black text-black/70">
                  Event Date*
                  <input type="date" required className="rounded-xl border border-black/10 px-4 py-3" value={form.event_date || ""} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
                </label>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-black text-black/70">
                  Start Time*
                  <input type="time" required className="rounded-xl border border-black/10 px-4 py-3" value={form.start_time || ""} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                </label>
                <label className="flex flex-col gap-2 text-sm font-black text-black/70">
                  End Time
                  <input type="time" className="rounded-xl border border-black/10 px-4 py-3" value={form.end_time || ""} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
                </label>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-black text-black/70">
                  Location
                  <input className="rounded-xl border border-black/10 px-4 py-3" value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </label>
                <label className="flex flex-col gap-2 text-sm font-black text-black/70">
                  Status*
                  <select className="rounded-xl border border-black/10 px-4 py-3" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-black text-black/70">
                  Button Text
                  <input className="rounded-xl border border-black/10 px-4 py-3" value={form.button_text || ""} onChange={(e) => setForm({ ...form, button_text: e.target.value })} />
                </label>
                <label className="flex flex-col gap-2 text-sm font-black text-black/70">
                  Button URL
                  <input className="rounded-xl border border-black/10 px-4 py-3" value={form.button_url || ""} onChange={(e) => setForm({ ...form, button_url: e.target.value })} />
                </label>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-black text-black/70">
                  Display Order
                  <input type="number" className="rounded-xl border border-black/10 px-4 py-3" value={form.display_order || 0} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} />
                </label>
                <label className="flex items-center gap-3 text-sm font-black text-black/70">
                  <input type="checkbox" checked={Boolean(form.is_featured)} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} />
                  Featured Event
                </label>
              </div>

              <label className="flex flex-col gap-2 text-sm font-black text-black/70">
                Description / Details*
                <textarea required rows={4} className="rounded-xl border border-black/10 px-4 py-3" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </label>

              <div className="grid gap-5 md:grid-cols-[1fr_auto]">
                <label className="flex flex-col gap-2 text-sm font-black text-black/70">
                  Event Image*
                  <div className="flex flex-wrap items-center gap-3">
                    <input type="file" accept="image/*" className="hidden" id="event-image-input" onChange={(e) => e.target.files && upload(e.target.files[0])} />
                    <label htmlFor="event-image-input" className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#083b68] px-4 py-3 text-xs font-black uppercase tracking-[.16em] text-white">
                      <Upload size={16} /> {uploading ? "Uploading..." : "Choose Image"}
                    </label>
                    <span className="text-xs text-black/50">{uploading ? "Uploading..." : form.image_url ? "Image selected" : "No image"}</span>
                  </div>
                </label>
                {form.image_url && <Image src={form.image_url} alt="" width={160} height={120} className="h-24 w-40 rounded-xl object-cover" />}
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-4">
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-black/10 px-5 py-3 text-sm font-black">Cancel</button>
                <button type="submit" disabled={saving || uploading} className="rounded-xl bg-[#083b68] px-5 py-3 text-sm font-black text-white disabled:opacity-70">
                  {saving ? "Saving..." : editingId ? "Save Event" : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
