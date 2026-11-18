"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type Artwork = { id: string; image_url: string; alt_text?: string | null; available_quantity: number; low_stock_threshold: number };
type Variant = { id: string; name: string; stock: number; inventory_mode: "traditional" | "photo"; length?: number; width?: number; height?: number; product_variant_images?: Artwork[] };
type InventoryProduct = { id: string; name: string; category?: string; image_url?: string; stock: number; inventory_mode: "traditional" | "photo"; product_variants?: Variant[] };

export default function InventoryPage() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/inventory", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load inventory");
      setProducts(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load inventory");
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const product = products.find((item) => item.id === selectedId);
  const variants = useMemo(() => product?.product_variants ?? [], [product]);
  const variant = variants.find((item) => item.id === variantId) ?? variants[0];
  useEffect(() => { if (product && !variants.some((item) => item.id === variantId)) setVariantId(variants[0]?.id || ""); }, [selectedId, product, variantId, variants]);

  async function save(imageId: string, value: number, expectedStock: number) {
    setSaving(imageId); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/inventory", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ variantId: variant?.id, imageId, stock: value, expectedStock }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save artwork stock");
      setMessage("Artwork stock saved.");
      await load();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Could not save artwork stock"); }
    finally { setSaving(null); }
  }
  async function quickSet() {
    const value = Number(window.prompt("Set every artwork in this size to:", "5"));
    if (!Number.isInteger(value) || value < 0) return;
    setSaving(variant?.id || "quick"); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/inventory", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ variantId: variant?.id, quickSet: value }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not quick-set artwork stock");
      setMessage(`${data.updated} artworks updated.`);
      await load();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Could not quick-set artwork stock"); }
    finally { setSaving(null); }
  }

  return <div className="p-6 md:p-10">
    <h1 className="text-4xl font-black">Visual inventory</h1>
    <p className="mt-2 text-sm text-black/50">Select a product, size, and artwork to manage photo-level stock.</p>
    {error && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {message && <p className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-700">{message}</p>}
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(18rem,24rem)_1fr]">
      <section className="grid gap-3">
        {loading ? <p>Loading inventory...</p> : products.map((item) => <button key={item.id} onClick={() => { setSelectedId(item.id); setVariantId(""); }} className={`flex items-center gap-3 rounded-2xl border p-3 text-left ${item.id === selectedId ? "border-[#083b68] bg-[#eef5f8]" : "border-black/10 bg-white"}`}>
          <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-[#eadfce]">{item.image_url && <Image src={item.image_url} alt="" fill className="object-cover" sizes="64px" />}</div>
          <span className="min-w-0 flex-1"><strong className="block truncate">{item.name}</strong><small className="text-black/50">{item.category || "Product"}</small></span><b>{item.stock}</b>
        </button>)}
      </section>
      <section className="rounded-2xl border border-black/10 bg-white p-5">
        {!product ? <p className="text-black/50">Choose a product to view its sizes.</p> : <><div className="flex flex-wrap gap-2">{variants.map((item) => <button key={item.id} onClick={() => setVariantId(item.id)} className={`rounded-full px-4 py-2 text-sm font-bold ${item.id === variant?.id ? "bg-[#083b68] text-white" : "bg-[#f3eee6]"}`}>{item.name}</button>)}</div>{variant?.inventory_mode === "photo" ? <><div className="mt-5 flex items-center justify-between"><h2 className="text-xl font-black">{variant.name} artwork</h2><button onClick={quickSet} disabled={Boolean(saving)} className="rounded-xl border px-3 py-2 text-sm font-bold disabled:opacity-50">Quick set all</button></div><div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">{(variant.product_variant_images ?? []).map((image) => <div key={image.id} className="rounded-xl border border-black/10 p-2"><div className="relative aspect-square overflow-hidden rounded-lg bg-[#eadfce]"><Image src={image.image_url} alt={image.alt_text || "Artwork"} fill className="object-cover" sizes="180px" /></div><input type="number" min="0" value={image.available_quantity} disabled={saving === image.id} onChange={(event) => save(image.id, Number(event.target.value), image.available_quantity)} className="mt-2 w-full rounded-lg border px-2 py-1 text-center font-bold" aria-label="Artwork stock" /></div>)}</div></> : <p className="mt-6 text-sm text-black/60">Traditional inventory: {variant?.stock ?? 0} units. Artwork controls are disabled until this size is explicitly switched to photo inventory.</p>}</>}
      </section>
    </div>
  </div>;
}
