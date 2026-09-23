"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface MediaFile { name: string; id: string | null; updated_at?: string; metadata?: { mimetype?: string; size?: number }; url: string; path: string; }

export default function MediaPage() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() { setLoading(true); try { const response = await fetch("/api/admin/upload", { cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not load media"); setFiles(Array.isArray(data) ? data : []); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Could not load media"); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  async function upload(event: React.ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; setUploading(true); setError(""); setMessage(""); const body = new FormData(); body.append("file", file); try { const response = await fetch("/api/admin/upload", { method: "POST", body }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Upload failed"); setMessage("Image uploaded successfully."); await load(); } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "Upload failed"); } finally { setUploading(false); event.target.value = ""; } }
  async function copy(url: string) { await navigator.clipboard.writeText(url); setMessage("Public URL copied."); }
  async function remove(path: string) { if (!confirm("Delete this media file?")) return; const response = await fetch(`/api/admin/upload?path=${encodeURIComponent(path)}`, { method: "DELETE" }); const data = await response.json(); if (!response.ok) { setError(data.error || "Could not delete media"); return; } await load(); }

  return <div className="p-6 md:p-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-black/45">Content</p><h1 className="text-4xl font-black">Media Library</h1><p className="mt-2 text-sm text-black/50">Manage images stored in the existing Trinity media bucket.</p></div><label className="cursor-pointer rounded-xl bg-[#083b68] px-5 py-3 text-sm font-bold text-white">{uploading ? "Uploading..." : "Upload image"}<input type="file" accept="image/*" onChange={upload} disabled={uploading} className="sr-only" /></label></div>{error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}{message && <p className="mt-6 rounded-xl bg-green-50 p-4 text-sm text-green-700">{message}</p>}<div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{loading ? <div className="col-span-full rounded-2xl border bg-white p-10 text-center text-sm text-black/50">Loading media...</div> : files.length === 0 ? <div className="col-span-full rounded-2xl border bg-white p-10 text-center text-sm text-black/50">No media files uploaded yet.</div> : files.map((file) => <article key={file.path} className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm"><div className="relative aspect-square bg-[#f5f6f7]"><Image src={file.url} alt={file.name} fill unoptimized className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" /></div><div className="p-4"><p className="truncate text-sm font-bold" title={file.path}>{file.path}</p><div className="mt-3 flex gap-2"><button onClick={() => copy(file.url)} className="flex-1 rounded-lg border px-3 py-2 text-xs font-bold">Copy URL</button><button onClick={() => remove(file.path)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700">Delete</button></div></div></article>)}</div></div>;
}
