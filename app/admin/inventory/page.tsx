"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type Artwork = { id: string; image_url: string; alt_text?: string | null; available_quantity: number; low_stock_threshold: number; sort_order: number };
type ProductImage = { id: string; image_url: string; alt_text?: string | null; sort_order: number };
type Variant = { id: string; name: string; stock: number; inventory_mode: "traditional" | "photo"; product_variant_images?: Artwork[] };
type InventoryProduct = { id: string; name: string; sku?: string; slug: string; category?: string; occasion?: string[]; image_url?: string; stock: number; inventory_mode: "traditional" | "photo"; product_images?: ProductImage[]; product_variants?: Variant[] };
type Change = { imageId?: string; productId?: string; value: number; expectedValue: number };

export default function InventoryPage() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [occasion, setOccasion] = useState("all");
  const [search, setSearch] = useState("");
  const [staged, setStaged] = useState<Record<string, number>>({});
  const catalogRef = useRef<HTMLElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);

  async function load(clearStaged = false) {
    const catalogScrollTop = catalogRef.current?.scrollTop ?? 0;
    const workspaceScrollTop = workspaceRef.current?.scrollTop ?? 0;
    setLoading(true);
    try {
      const response = await fetch("/api/admin/inventory", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load inventory");
      const next = Array.isArray(data) ? data : [];
      setProducts(next);
      setSelectedId((current) => current && next.some((item: InventoryProduct) => item.id === current) ? current : next[0]?.id || "");
      if (clearStaged) setStaged({});
      requestAnimationFrame(() => {
        if (catalogRef.current) catalogRef.current.scrollTop = catalogScrollTop;
        if (workspaceRef.current) workspaceRef.current.scrollTop = workspaceScrollTop;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load inventory");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filteredProducts = useMemo(() => products.filter((item) => {
    const query = search.trim().toLocaleLowerCase();
    return (occasion === "all" || item.occasion?.includes(occasion)) &&
      (!query || `${item.name} ${item.slug} ${item.sku || ""}`.toLocaleLowerCase().includes(query));
  }), [occasion, products, search]);
  const product = filteredProducts.find((item) => item.id === selectedId) ?? filteredProducts[0];
  const variants = useMemo(() => product?.product_variants ?? [], [product]);
  const variant = variants.find((item) => item.id === variantId) ?? variants[0];
  const artworks = useMemo(() => [...(variant?.product_variant_images ?? [])].sort((a, b) => {
    const left = staged[a.id] ?? a.available_quantity;
    const right = staged[b.id] ?? b.available_quantity;
    return right - left || a.sort_order - b.sort_order;
  }), [staged, variant]);
  const changes = useMemo<Change[]>(() => {
    const next: Change[] = [];
    for (const [id, value] of Object.entries(staged)) {
      if (id.startsWith("product:")) {
        const productId = id.slice("product:".length);
        const item = products.find((product) => product.id === productId);
        if (item && item.stock !== value) next.push({ productId, value, expectedValue: item.stock });
        continue;
      }
      const image = products.flatMap((item) => item.product_variants ?? []).flatMap((item) => item.product_variant_images ?? []).find((item) => item.id === id);
      if (image && image.available_quantity !== value) next.push({ imageId: id, value, expectedValue: image.available_quantity });
    }
    return next;
  }, [products, staged]);
  const occasions = Array.from(new Set([
    ...products.flatMap((item) => item.occasion ?? []),
    "Coming Soon",
  ])).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }));

  useEffect(() => {
    if (product && product.id !== selectedId) setSelectedId(product.id);
  }, [product, selectedId]);

  useEffect(() => {
    if (product && !variants.some((item) => item.id === variantId)) setVariantId(variants[0]?.id || "");
  }, [product, variantId, variants]);

  function stage(id: string, value: number) {
    if (Number.isInteger(value) && value >= 0 && value <= 100000) setStaged((current) => ({ ...current, [id]: value }));
  }

  function quickSet() {
    const value = Number(window.prompt("Set every artwork in this size to:", "5"));
    if (!Number.isInteger(value) || value < 0) return;
    setStaged((current) => ({ ...current, ...Object.fromEntries(artworks.map((image) => [image.id, value])) }));
  }

  async function save() {
    if (!changes.length) return;
    const savedChanges = changes;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/inventory/batch-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes: savedChanges }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save inventory changes");
      setMessage(`${data.updated} inventory change${data.updated === 1 ? "" : "s"} saved.`);
      setProducts((current) => current.map((item) => {
        if (!item.product_variants?.length) {
          const productChange = savedChanges.find((change) => change.productId === item.id);
          return productChange ? { ...item, stock: productChange.value } : item;
        }

        let variantChanged = false;
        const nextVariants = item.product_variants.map((variant) => {
          if (!variant.product_variant_images?.length) return variant;
          let imagesChanged = false;
          const nextImages = variant.product_variant_images.map((image) => {
            const imageChange = savedChanges.find((change) => change.imageId === image.id);
            if (!imageChange) return image;
            imagesChanged = true;
            variantChanged = true;
            return { ...image, available_quantity: imageChange.value };
          });
          if (!imagesChanged) return variant;
          return {
            ...variant,
            stock: nextImages.reduce((total, image) => total + image.available_quantity, 0),
            product_variant_images: nextImages,
          };
        });

        if (!variantChanged) return item;
        return {
          ...item,
          inventory_mode: "photo",
          stock: nextVariants.reduce((total, variant) => total + variant.stock, 0),
          product_variants: nextVariants,
        };
      }));
      setStaged({});
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save inventory changes");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return <div className="min-h-full p-4 md:p-8">
    <h1 className="text-4xl font-black">Visual inventory</h1>
    <p className="mt-2 text-sm text-black/50">Stage photo-level stock changes locally, then save them together.</p>
    <div className="sticky top-0 z-10 mt-6 grid gap-3 rounded-2xl border border-black/10 bg-[#fffaf3]/95 p-3 shadow-sm backdrop-blur md:grid-cols-[minmax(0,1fr)_180px_auto_auto]">
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, SKU or keyword" aria-label="Search title, SKU or keyword" className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm" />
      <select value={occasion} onChange={(event) => setOccasion(event.target.value)} aria-label="Filter by occasion" className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"><option value="all">All occasions</option>{occasions.map((item) => <option key={item}>{item}</option>)}</select>
      <span className="self-center text-sm text-black/55">{filteredProducts.length} products</span>
      <button type="button" onClick={() => void load()} disabled={loading || saving} className="rounded-xl border px-3 py-2 text-sm font-bold disabled:opacity-50">Refresh</button>
    </div>
    {error && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {message && <p className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-700">{message}</p>}
    <div className="mt-6 grid min-h-0 gap-6 lg:grid-cols-[minmax(18rem,380px)_minmax(0,1fr)]">
      <section ref={catalogRef} className="max-h-[calc(100vh-15rem)] space-y-3 overflow-y-auto pr-1">
        {loading ? <p>Loading inventory...</p> : filteredProducts.length === 0 ? <p className="rounded-2xl border border-dashed p-6 text-sm text-black/50">No products match these filters.</p> : filteredProducts.map((item) => <button key={item.id} onClick={() => { setSelectedId(item.id); setVariantId(""); }} className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition ${item.id === product?.id ? "border-[#b48d55] bg-[#fffaf3]" : "border-black/10 bg-white"}`}>
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#eadfce]">{item.image_url ? <Image src={item.image_url} alt="" fill className="object-cover" sizes="64px" /> : <span className="grid h-full place-items-center text-xs text-black/40">No image</span>}</div>
          <span className="min-w-0 flex-1"><strong className="block truncate">{item.name}</strong><small className="block truncate text-black/50">{item.slug} · {item.category || "Product"}</small>{item.occasion?.[0] && <small className="text-[#b48d55]">{item.occasion[0]}</small>}</span><b>{item.stock}</b>
        </button>)}
      </section>
      <section ref={workspaceRef} className="max-h-[calc(100vh-15rem)] overflow-y-auto rounded-2xl border border-black/10 bg-white p-4 md:p-5">
        {!product ? <p className="text-black/50">Choose a product to view its sizes.</p> : <>
          <div className="flex items-start justify-between gap-4"><div><p className="text-sm text-black/50">{product.sku ? `SKU ${product.sku} · ` : ""}{product.slug}</p><h2 className="text-2xl font-black">{product.name}</h2><p className="mt-1 text-sm text-black/55">Total stock: {product.stock} · {product.occasion?.join(", ") || "No occasion"}</p></div></div>
          {variants.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{variants.map((item) => <button key={item.id} onClick={() => setVariantId(item.id)} className={`rounded-full px-4 py-2 text-sm font-bold ${item.id === variant?.id ? "bg-[#083b68] text-white" : "bg-[#f3eee6]"}`}>{item.name} ({item.stock})</button>)}</div>}
          {variants.length === 0 ? (() => {
            const image = product.product_images?.[0];
            const key = `product:${product.id}`;
            const value = staged[key] ?? product.stock;
            return <div className="mt-5"><h3 className="text-xl font-black">Product artwork</h3><div className="mt-4 max-w-xs rounded-xl border border-black/10 p-3"><div className="relative aspect-square overflow-hidden rounded-lg bg-[#eadfce]">{image || product.image_url ? <Image src={image?.image_url || product.image_url || ""} alt={image?.alt_text || product.name} fill className="object-cover" sizes="300px" /> : null}</div><p className="mt-2 truncate text-xs text-black/55">{image?.alt_text || product.name}</p><div className="mt-2 flex items-center justify-between gap-2"><button type="button" onClick={() => stage(key, Math.max(0, value - 1))} className="h-8 w-8 rounded-lg border" aria-label="Decrease stock">-</button><input type="number" min="0" value={value} onChange={(event) => stage(key, Number(event.target.value))} className="w-full rounded-lg border px-2 py-1 text-center font-bold" aria-label="Product stock" /><button type="button" onClick={() => stage(key, value + 1)} className="h-8 w-8 rounded-lg border" aria-label="Increase stock">+</button></div></div></div>;
          })() : <><div className="mt-5 flex items-center justify-between"><h3 className="text-xl font-black">{variant.name} artwork</h3><button onClick={quickSet} disabled={saving || !artworks.length} className="rounded-xl border px-3 py-2 text-sm font-bold disabled:opacity-50">Quick set all</button></div>{artworks.length ? <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">{artworks.map((image) => { const value = staged[image.id] ?? image.available_quantity; return <div key={image.id} className="rounded-xl border border-black/10 p-2"><div className="relative aspect-square overflow-hidden rounded-lg bg-[#eadfce]"><Image src={image.image_url} alt={image.alt_text || "Artwork"} fill className="object-cover" sizes="180px" /></div><p className="mt-2 truncate text-xs text-black/55">{image.alt_text || "Artwork"}</p><div className="mt-2 flex items-center justify-between gap-2"><button type="button" onClick={() => stage(image.id, Math.max(0, value - 1))} className="h-8 w-8 rounded-lg border" aria-label="Decrease stock">-</button><input type="number" min="0" value={value} onChange={(event) => stage(image.id, Number(event.target.value))} className="w-full rounded-lg border px-2 py-1 text-center font-bold" aria-label="Artwork stock" /><button type="button" onClick={() => stage(image.id, value + 1)} className="h-8 w-8 rounded-lg border" aria-label="Increase stock">+</button></div><span className={`mt-2 block text-center text-xs font-bold ${value > 0 && value <= 4 ? "text-amber-700" : value === 0 ? "text-black/40" : "text-green-700"}`}>{value === 0 ? "Zero stock" : value <= 4 ? "Low stock" : "In stock"}</span></div>; })}</div> : <p className="mt-6 text-sm text-black/60">No artwork is assigned to this size.</p>}</>}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4"><span className="text-sm font-bold">{changes.length ? `${changes.length} unsaved change${changes.length === 1 ? "" : "s"}` : "All changes saved"}</span><button onClick={() => void save()} disabled={!changes.length || saving} className="rounded-xl bg-[#b48d55] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving..." : "Save changes"}</button></div>
        </>}
      </section>
    </div>
  </div>;
}
