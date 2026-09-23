 "use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, ChevronDown, ImagePlus, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import type { Product, ProductImage, ProductShippingLocation } from "@/lib/data";

type Form = Partial<Product> & {
  stock?: number;
  image_url?: string;
  is_published?: boolean;
};

type SelectOption = { value: string; label: string };

const shippingStates = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;

function emptyShippingLocations(): ProductShippingLocation[] {
  return shippingStates.map((state) => ({ state, suburb: "", metro: "" }));
}

function normalizedShippingLocations(locations: unknown): ProductShippingLocation[] {
  const byState = new Map(
    Array.isArray(locations)
      ? locations.filter((location): location is ProductShippingLocation => Boolean(location && typeof location === "object" && shippingStates.includes((location as ProductShippingLocation).state)))
        .map((location) => [location.state, location])
      : [],
  );
  return shippingStates.map((state) => {
    const location = byState.get(state);
    return { state, suburb: location?.suburb || "", metro: location?.metro || "" };
  });
}

function MultiSelect({
  label,
  values,
  options,
  onChange,
  emptyMessage,
}: {
  label: string;
  values: string[];
  options: SelectOption[];
  onChange: (values: string[]) => void;
  emptyMessage: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, []);

  function toggle(value: string) {
    onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  return (
    <div ref={wrapperRef} className="relative mt-4">
      <span className="text-sm font-bold">{label}</span>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
          if ((event.key === "Enter" || event.key === " ") && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="mt-2 flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 text-left text-sm font-semibold text-[#0b4166] shadow-sm transition hover:border-[#2479a8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2479a8]"
      >
        <span>{options.length ? "Select options" : emptyMessage}</span>
        <ChevronDown size={17} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2" aria-label={`${label} selected`}>
          {values.map((value) => (
            <span key={value} className="inline-flex items-center gap-1 rounded-full bg-[#e5f0f5] px-3 py-1.5 text-xs font-bold text-[#0b4166]">
              {value}
              <button type="button" onClick={() => toggle(value)} className="rounded-full p-0.5 hover:bg-[#c9dfe9]" aria-label={`Remove ${value}`}>
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="absolute inset-x-0 top-full z-20 mt-2 max-h-56 overflow-auto rounded-xl border border-black/10 bg-white p-2 shadow-xl" role="listbox" aria-label={label}>
          {options.length === 0 ? (
            <p className="px-3 py-3 text-sm text-black/50">{emptyMessage}</p>
          ) : options.map((option) => {
            const selected = values.includes(option.value);
            return (
              <button key={option.value} type="button" role="option" aria-selected={selected} onClick={() => toggle(option.value)} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-[#f6f0e7]">
                <span>{option.label}</span>
                {selected && <Check size={16} className="text-[#2479a8]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/[\s-]+/g, "-").replace(/^-+|-+$/g, "");
}

const blank: Form = {
  name: "",
  slug: "",
  category: "",
  price: 0,
  stock: 0,
  image_url: "",
  description: "",
  meaning: "",
  occasion: [],
  giftFor: [],
  is_published: true,
  featured: false,
  length: null,
  width: null,
  height: null,
  weight: null,
  product_shipping_locations: emptyShippingLocations(),
};

export default function AdminProducts() {
  const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState<Form>(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [occasionOptions, setOccasionOptions] = useState<SelectOption[]>([]);
  const [occasionFilter, setOccasionFilter] = useState("all");
  const [optionsError, setOptionsError] = useState("");
  const [success, setSuccess] = useState("");
  const [gallery, setGallery] = useState<ProductImage[]>([]);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryProgress, setGalleryProgress] = useState({ uploaded: 0, total: 0 });
  const [originalProduct, setOriginalProduct] = useState<any | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError("");

      const r = await fetch("/api/admin/products", {
        cache: "no-store",
      });

      const d = await r.json();

      if (!r.ok) {
        setError(d.error || "Could not load products");
        setList([]);
        return;
      }

      // IMPORTANT:
      // No dummy/seed fallback here.
      // If Supabase has no products, the list stays empty.
      const products = Array.isArray(d) ? d : [];
      setList(products);

      const occasionsResponse = await fetch("/api/admin/occasions", { cache: "no-store" });
      const occasionsData = occasionsResponse.ok ? await occasionsResponse.json() : [];
      if (!occasionsResponse.ok) setOptionsError("Occasions could not be loaded. Existing selections are preserved.");
      setOccasionOptions(Array.isArray(occasionsData) ? occasionsData.filter((item) => item?.name).map((item) => ({ value: item.name, label: item.name })) : []);
    } catch (err) {
      console.error(err);
      setError("Could not load products");
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function edit(p: any) {
    setEditing(p.id);
    setOriginalProduct(p);
    setSlugManuallyEdited(true);

    setForm({
      ...p,
      image_url: p.image_url || p.image || "",
      image: p.image_url || p.image || "",
      featured: Boolean(p.is_featured ?? p.featured),
      is_published: p.is_published !== false,
      occasion: p.occasion || [],
      giftFor: p.gift_for || p.giftFor || [],
      length: p.length ?? null,
      width: p.width ?? null,
      height: p.height ?? null,
      weight: p.weight ?? null,
      product_shipping_locations: normalizedShippingLocations(p.product_shipping_locations),
    });
    setGallery(Array.isArray(p.product_images) ? [...p.product_images].sort((a, b) => a.sort_order - b.sort_order) : []);
    setGalleryFiles([]);

    setError("");
    setSuccess("");
    setOpen(true);
  }

  async function uploadImage(file: File) {
    setError("");
    setUploading(true);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const r = await fetch("/api/admin/upload", {
        method: "POST",
        body: fd,
      });

      const d = await r.json();

      if (r.ok) {
        setForm((f) => ({
          ...f,
          image_url: d.url,
          image: d.url,
        }));
      } else {
        setError(d.error || "Upload failed");
      }
    } catch (err) {
      console.error(err);
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function stageGalleryFiles(files: FileList | null) {
    if (!files) return;
    const incoming = Array.from(files).filter((file) => file.type.startsWith("image/"));
    setGalleryFiles((current) => {
      const keys = new Set(current.map((file) => `${file.name}:${file.size}:${file.lastModified}`));
      return [...current, ...incoming.filter((file) => !keys.has(`${file.name}:${file.size}:${file.lastModified}`))];
    });
  }

  async function uploadGallery(productId: string) {
    if (!galleryFiles.length) return true;
    setGalleryUploading(true);
    const files = [...galleryFiles];
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    setGalleryProgress({ uploaded: 0, total: totalBytes });
    const failed: string[] = [];
    let completedBytes = 0;
    try {
      for (let start = 0; start < files.length; start += 3) {
        let pending = files.slice(start, start + 3).map((file, index) => ({
          file,
          stableIndex: gallery.length + start + index,
          clientId: crypto.randomUUID(),
        }));
        for (let attempt = 0; attempt < 3 && pending.length; attempt += 1) {
          const formData = new FormData();
          pending.forEach(({ file }) => formData.append("files", file, file.name));
          formData.append("metadata", JSON.stringify(pending.map(({ stableIndex, clientId }) => ({ stableIndex, clientId }))));
          try {
            const response = await fetch(`/api/admin/products/${productId}/images`, { method: "POST", body: formData });
            const responseText = await response.text();
            let data: { results?: { fileName: string; success: boolean; error?: string }[]; error?: string };
            try { data = JSON.parse(responseText); } catch { throw new Error(`HTTP ${response.status}: ${responseText || "Non-JSON response"}`); }
            if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
            const results = data.results || [];
            pending = pending.filter((item) => {
              const result = results.find((entry) => entry.fileName === item.file.name);
              if (result?.success) {
                completedBytes += item.file.size;
                setGalleryProgress({ uploaded: completedBytes, total: totalBytes });
                return false;
              }
              return true;
            });
            if (pending.length && attempt < 2) await new Promise((resolve) => window.setTimeout(resolve, 1000 * 2 ** attempt));
          } catch (error) {
            if (attempt === 2) {
              pending.forEach(({ file }) => failed.push(`${file.name}: ${error instanceof Error ? error.message : "Batch upload failed"}`));
              pending = [];
            }
            else await new Promise((resolve) => window.setTimeout(resolve, 1000 * 2 ** attempt));
          }
        }
        pending.forEach(({ file }) => failed.push(`${file.name}: Upload failed after 3 attempts`));
      }
      if (failed.length) {
        setError(`Gallery upload completed with ${failed.length} failure${failed.length === 1 ? "" : "s"}: ${failed.join("; ")}`);
        return false;
      }
      setGalleryProgress({ uploaded: totalBytes, total: totalBytes });
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("[Gallery] Batch upload error", { productId, error: errorMessage });
      setError(`Gallery upload failed: ${errorMessage}`);
      return false;
    } finally {
      setGalleryUploading(false);
    }
  }

  async function deleteGalleryImage(image: ProductImage) {
    if (!editing) return;
    const response = await fetch(`/api/admin/products/${editing}/images?imageId=${encodeURIComponent(image.id)}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) return setError(data.error || "Could not delete gallery image.");
    setGallery((current) => current.filter((item) => item.id !== image.id));
  }

  async function moveGalleryImage(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (!editing || nextIndex < 0 || nextIndex >= gallery.length) return;
    const next = [...gallery];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setGallery(next);
    const response = await fetch(`/api/admin/products/${editing}/images`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images: next }),
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error || "Could not save gallery order.");
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving || uploading || galleryUploading) return;
    setError("");

    const slug = slugify(form.slug || "");
    const price = Number(form.price);
    const stock = Number(form.stock);
    const dimensions = [form.length, form.width, form.height, form.weight];
    if (!form.name?.trim()) return setError("Name is required.");
    if (!slug) return setError("Slug is required.");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return setError("Slug must use lowercase letters, numbers, and hyphens.");
    if (!Number.isFinite(price) || price < 0) return setError("Price must be a valid non-negative number.");
    if (!Number.isInteger(stock) || stock < 0) return setError("Stock must be a valid non-negative integer.");
    if (dimensions.some((value) => value !== null && value !== undefined && (!Number.isFinite(value) || value < 0))) return setError("Dimensions must be non-negative numbers.");

    setSaving(true);

    const statusOnlyUpdate = Boolean(
      editing &&
      originalProduct &&
      !galleryFiles.length &&
      form.name === originalProduct.name &&
      form.slug === originalProduct.slug &&
      form.category === originalProduct.category &&
      Number(form.price) === Number(originalProduct.price) &&
      Number(form.stock) === Number(originalProduct.stock) &&
      form.description === originalProduct.description &&
       form.meaning === originalProduct.meaning &&
       form.length === (originalProduct.length ?? null) &&
       form.width === (originalProduct.width ?? null) &&
       form.height === (originalProduct.height ?? null) &&
       form.weight === (originalProduct.weight ?? null) &&
       JSON.stringify(normalizedShippingLocations(form.product_shipping_locations)) === JSON.stringify(normalizedShippingLocations(originalProduct.product_shipping_locations)) &&
      JSON.stringify(form.occasion || []) === JSON.stringify(originalProduct.occasion || []) &&
      JSON.stringify(form.giftFor || []) === JSON.stringify(originalProduct.gift_for || originalProduct.giftFor || []) &&
      Boolean(form.featured) === Boolean(originalProduct.is_featured ?? originalProduct.featured) &&
      form.is_published !== (originalProduct.is_published !== false)
    );

    const payload = statusOnlyUpdate
      ? { is_published: form.is_published !== false, product_shipping_locations: normalizedShippingLocations(form.product_shipping_locations) }
      : {
      ...form,
      slug,
      price,
      stock,
      is_featured: Boolean(form.featured),
      is_published: form.is_published !== false,
      gift_for: form.giftFor || [],
      occasion: form.occasion || [],
       image_url: form.image_url || form.image || "",
       product_shipping_locations: normalizedShippingLocations(form.product_shipping_locations),
       };

    let productTimeout: number | undefined;
    try {
      console.info(`[Product] ${statusOnlyUpdate ? "Updating status for" : editing ? "Updating" : "Creating"} product`);
      const productController = new AbortController();
      productTimeout = window.setTimeout(() => productController.abort(), 60000);
      const r = await fetch(
        editing
          ? `/api/admin/products/${editing}`
          : "/api/admin/products",
        {
          method: editing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: productController.signal,
        }
      );
      window.clearTimeout(productTimeout);
      productTimeout = undefined;

      const d = await r.json();

      if (!r.ok) {
        console.error("[Gallery] Product request failed", { status: r.status, data: d });
        setError(d.error || "Could not save product");
        return;
      }

      console.info("[Gallery] Product created", { id: d.id });

      if (!statusOnlyUpdate && !(await uploadGallery(d.id))) return;

      console.info("[Gallery] Product save complete", { id: d.id });

      setOpen(false);
      setEditing(null);
      setForm(blank);
      setGallery([]);
      setGalleryFiles([]);
      setOriginalProduct(null);
      setSuccess(editing ? "Product updated successfully." : "Product created successfully.");

      await load();
    } catch (err) {
      console.error("[Gallery] Product save error", err);
      setError(err instanceof DOMException && err.name === "AbortError" ? "Product save timed out." : "Could not save product");
    } finally {
      if (productTimeout) window.clearTimeout(productTimeout);
      setSaving(false);
    }
  }

  async function del(id: string) {
    if (!confirm("Delete this product?")) return;

    try {
      const r = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
      });

      if (!r.ok) {
        const d = await r.json();
        setError(d.error || "Could not delete product");
        return;
      }

      await load();
    } catch (err) {
      console.error(err);
      setError("Could not delete product");
    }
  }

  function newProduct() {
    setEditing(null);
    setForm(blank);
    setSlugManuallyEdited(false);
    setError("");
    setSuccess("");
    setGallery([]);
    setGalleryFiles([]);
    setOpen(true);
  }

  const categoryOptions = Array.from(new Set([
    "Crosses",
    "Jewelry",
    "Prayer & Journals",
    "Candles",
    "Keepsakes",
    "Home Decor",
    ...list.map((product) => product.category).filter((value): value is string => Boolean(value)),
  ])).sort().map((value) => ({ value, label: value }));
  const giftForValues = ["Woman", "Man", "Child", "Couple", "Friend"];

const giftForOptions = Array.from(
  new Set([
    ...giftForValues,
    ...list.flatMap((product) =>
      Array.isArray(product.gift_for)
        ? product.gift_for
        : Array.isArray(product.giftFor)
          ? product.giftFor
          : []
    ),
  ])
)
  .sort()
  .map((value) => ({ value, label: value }));
  const visibleProducts = list.filter((product) => occasionFilter === "all" || (Array.isArray(product.occasion) && product.occasion.includes(occasionFilter)));

  return (
    <div className="p-6 md:p-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-black/45">Store</p>
          <h1 className="text-4xl font-black">Products</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-bold text-[#5d3b2a]">
            <span className="sr-only">Filter products by occasion</span>
            <select value={occasionFilter} onChange={(event) => setOccasionFilter(event.target.value)} className="rounded-xl border border-[#d9c6b0] bg-[#fffdf8] px-4 py-3 text-sm font-semibold text-[#5d3b2a]">
              <option value="all">All Occasions</option>
              {occasionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <button
            onClick={newProduct}
            className="inline-flex items-center gap-2 rounded-xl bg-[#083b68] px-5 py-3 text-sm font-bold text-white"
          >
            <Plus size={17} />
            Add product
          </button>
        </div>
      </div>

      {error && !open && (
        <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {success && !open && <p className="mt-5 rounded-xl bg-green-50 p-3 text-sm text-green-700">{success}</p>}

      <div className="mt-8">
        {loading ? (
          <div className="rounded-2xl border border-[#dfcfbd] bg-[#fffdf8] p-10 text-center text-black/50">
            Loading products...
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-[#dfcfbd] bg-[#fffdf8] p-12 text-center">
            <div className="font-semibold text-black/70">No products yet</div>
            <p className="mt-1 text-sm text-black/40">Your product catalog is currently empty.</p>
            <button
              onClick={newProduct}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#5d3b2a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#472d23]"
            >
              <Plus size={17} />
              Add your first product
            </button>
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="rounded-2xl border border-[#dfcfbd] bg-[#fffdf8] p-12 text-center text-black/50">
            No products match this occasion.
          </div>
        ) : (
          <div className="grid min-w-0 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visibleProducts.map((p) => {
              const image = p.image_url || p.image || "";
              return (
                <article key={p.id} className="min-w-0 overflow-hidden rounded-2xl border border-[#dfcfbd] bg-[#fffdf8] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#eadfce]">
                    {image ? (
                      <Image src={image} alt={p.name || "Product"} fill unoptimized className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw" />
                    ) : (
                      <div className="grid h-full place-items-center text-[#b48d55]" aria-label="No product image">
                        <ImagePlus size={30} />
                      </div>
                    )}
                    <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold ${p.is_published ? "bg-[#f3e9dc] text-[#5d3b2a]" : "bg-black/10 text-black/55"}`}>
                      {p.is_published ? "Published" : "Draft"}
                    </span>
                  </div>

                  <div className="min-w-0 p-5">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate font-black text-[#2f241e]">{p.name}</h2>
                        <p className="mt-1 truncate text-sm text-black/45">{p.category || "Uncategorized"}</p>
                      </div>
                      <p className="shrink-0 text-lg font-black text-[#5d3b2a]">${Number(p.price).toFixed(2)}</p>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#eadfce] pt-4">
                      <p className="text-xs font-bold uppercase tracking-[.12em] text-black/45">{p.stock ?? 0} in stock</p>
                      <div className="flex gap-1">
                        <button onClick={() => edit(p)} className="rounded-lg p-2 text-[#5d3b2a] transition hover:bg-[#f3e9dc]" aria-label={`Edit ${p.name}`}>
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => del(p.id)} className="rounded-lg p-2 text-red-700 transition hover:bg-red-50" aria-label={`Delete ${p.name}`}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/40 p-5">
          <form
            onSubmit={save}
            className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-3xl bg-[#fffaf3] p-7 shadow-2xl"
          >
            <div className="flex justify-between">
              <h2 className="display-font text-4xl">
                {editing ? "Edit product" : "New product"}
              </h2>

              <button
                type="button"
                onClick={() => setOpen(false)}
              >
                <X />
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold">
                Name
                <input
                  required
                  value={form.name || ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugManuallyEdited ? form.slug : slugify(e.target.value) })}
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white p-3 outline-none transition focus:border-[#2479a8] focus:ring-2 focus:ring-[#2479a8]/15"
                />
              </label>

              <label className="text-sm font-bold">
                Slug
                <input
                  required
                  value={form.slug || ""}
                  onChange={(e) => { setSlugManuallyEdited(true); setForm({ ...form, slug: e.target.value }); }}
                  onBlur={() => setForm((current) => ({ ...current, slug: slugify(current.slug || "") }))}
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white p-3 outline-none transition focus:border-[#2479a8] focus:ring-2 focus:ring-[#2479a8]/15"
                />
              </label>

              <label className="text-sm font-bold">
                Category
                <input
                  value={form.category || ""}
                  list="product-categories"
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Enter or choose a category"
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white p-3 outline-none transition focus:border-[#2479a8] focus:ring-2 focus:ring-[#2479a8]/15"
                />
                <datalist id="product-categories">{categoryOptions.map((option) => <option key={option.value} value={option.value} />)}</datalist>
              </label>

              <label className="text-sm font-bold">
                Price
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price ?? 0}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      price: Number(e.target.value),
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white p-3 outline-none transition focus:border-[#2479a8] focus:ring-2 focus:ring-[#2479a8]/15"
                />
              </label>

              <label className="text-sm font-bold">
                Stock
                <input
                  type="number"
                  min="0"
                  value={form.stock ?? 0}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      stock: Number(e.target.value),
                    })
                  }
                  required
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white p-3 outline-none transition focus:border-[#2479a8] focus:ring-2 focus:ring-[#2479a8]/15"
                />
              </label>

              <label className="text-sm font-bold">
                Image URL
                <input
                  value={form.image_url || form.image || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      image_url: e.target.value,
                      image: e.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white p-3 outline-none transition focus:border-[#2479a8] focus:ring-2 focus:ring-[#2479a8]/15"
                />

                <span className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-black/15 bg-[#f6f0e7] px-3 py-2">
                  <Upload size={14} />

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      e.target.files?.[0] &&
                      uploadImage(e.target.files[0])
                    }
                    disabled={uploading}
                    className="min-w-0 text-xs font-normal"
                  />
                  {uploading && <span className="text-xs font-semibold text-[#2479a8]">Uploading...</span>}
                </span>
                {(form.image_url || form.image) && <div className="mt-3 flex items-center gap-3 rounded-xl border border-black/10 bg-white p-2"><Image src={form.image_url || form.image || ""} alt="Product preview" width={56} height={56} unoptimized className="h-14 w-14 rounded-lg object-cover" /><span className="min-w-0 truncate text-xs text-black/50">Image ready</span></div>}
              </label>
            </div>

            <section className="mt-6 rounded-2xl border border-black/10 bg-white p-4" aria-labelledby="product-gallery-heading">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 id="product-gallery-heading" className="text-sm font-black uppercase tracking-[0.15em] text-[#0b4166]">Product Gallery</h3>
                  <p className="mt-1 text-xs text-black/50">Add supporting photos for this one product. Selected order is preserved.</p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#0b4166]/20 bg-[#f6f0e7] px-3 py-2 text-xs font-bold text-[#0b4166]">
                  <ImagePlus size={15} /> Add images
                  <input type="file" accept="image/*" multiple className="sr-only" onChange={(event) => { stageGalleryFiles(event.target.files); event.target.value = ""; }} disabled={saving || galleryUploading} />
                </label>
              </div>

              {(gallery.length > 0 || galleryFiles.length > 0) && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {gallery.map((image, index) => (
                    <div key={image.id} className="group relative overflow-hidden rounded-xl border border-black/10 bg-[#f6f0e7]">
                      <Image src={image.image_url} alt={image.alt_text || `${form.name || "Product"} gallery image ${index + 1}`} width={180} height={135} unoptimized className="aspect-[4/3] w-full object-cover" loading="lazy" />
                      <div className="absolute inset-x-1 bottom-1 flex items-center justify-between rounded-lg bg-black/65 p-1 text-white">
                        <button type="button" onClick={() => moveGalleryImage(index, -1)} disabled={index === 0} className="rounded p-1 disabled:opacity-30" aria-label="Move image earlier">â†</button>
                        <span className="text-[10px] font-bold">{index + 1}</span>
                        <button type="button" onClick={() => moveGalleryImage(index, 1)} disabled={index === gallery.length - 1} className="rounded p-1 disabled:opacity-30" aria-label="Move image later">â†’</button>
                        <button type="button" onClick={() => deleteGalleryImage(image)} className="rounded p-1 text-red-200 hover:bg-white/20" aria-label={`Delete gallery image ${index + 1}`}><Trash2 size={13} /></button>
                      </div>
                    </div>
                  ))}
                  {galleryFiles.map((file, index) => (
                    <div key={`${file.name}-${file.lastModified}`} className="relative overflow-hidden rounded-xl border border-dashed border-[#2479a8] bg-[#eef7fb] p-3">
                      <div className="grid aspect-[4/3] place-items-center rounded-lg bg-[#d9edf5] text-center text-xs font-bold text-[#0b4166]">{file.name}</div>
                      <button type="button" onClick={() => setGalleryFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="absolute right-2 top-2 rounded-full bg-white p-1 text-red-600 shadow" aria-label={`Remove pending image ${file.name}`}><X size={13} /></button>
                      <p className="mt-2 text-[10px] font-bold text-[#2479a8]">Ready to upload</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <MultiSelect label="Occasions" values={form.occasion || []} options={occasionOptions} onChange={(occasion) => setForm({ ...form, occasion })} emptyMessage={optionsError || "No occasions available."} />
            <MultiSelect label="Gift for" values={form.giftFor || []} options={giftForOptions} onChange={(giftFor) => setForm({ ...form, giftFor })} emptyMessage="No Gift For values found in existing products." />

            <label className="mt-4 block text-sm font-bold">
              Description

              <textarea
                value={form.description || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    description: e.target.value,
                  })
                }
                className="mt-2 min-h-24 w-full rounded-xl border border-black/10 bg-white p-3 outline-none transition focus:border-[#2479a8] focus:ring-2 focus:ring-[#2479a8]/15"
              />
            </label>

            <label className="mt-4 block text-sm font-bold">
              Meaning

              <textarea
                value={form.meaning || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    meaning: e.target.value,
                  })
                }
                className="mt-2 min-h-20 w-full rounded-xl border border-black/10 bg-white p-3 outline-none transition focus:border-[#2479a8] focus:ring-2 focus:ring-[#2479a8]/15"
              />
            </label>

            <div className="mt-6 border-t border-black/10 pt-5">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {(["length", "width", "height", "weight"] as const).map((dimension) => (
                  <label key={dimension} className="min-w-0 text-sm font-bold">
                    {dimension === "length" ? "L" : dimension === "width" ? "W" : dimension === "height" ? "H" : "Weight"}
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={form[dimension] ?? ""}
                      onChange={(event) => setForm({ ...form, [dimension]: event.target.value === "" ? null : Number(event.target.value) })}
                      className="mt-2 w-full rounded-xl border border-black/10 bg-white p-3 outline-none transition focus:border-[#2479a8] focus:ring-2 focus:ring-[#2479a8]/15"
                    />
                  </label>
                ))}
              </div>

              <div className="mt-5 space-y-3">
                {normalizedShippingLocations(form.product_shipping_locations).map((location) => (
                  <div key={location.state} className="grid grid-cols-1 gap-3 sm:grid-cols-[3.5rem_minmax(0,1fr)_minmax(0,1fr)] sm:items-end">
                    <span className="pb-3 text-sm font-black text-[#0b4166]">{location.state}</span>
                    <label className="min-w-0 text-sm font-bold">
                      SUBURB
                      <input
                        value={location.suburb}
                        onChange={(event) => setForm({ ...form, product_shipping_locations: normalizedShippingLocations(form.product_shipping_locations).map((item) => item.state === location.state ? { ...item, suburb: event.target.value } : item) })}
                        className="mt-2 w-full rounded-xl border border-black/10 bg-white p-3 outline-none transition focus:border-[#2479a8] focus:ring-2 focus:ring-[#2479a8]/15"
                      />
                    </label>
                    <label className="min-w-0 text-sm font-bold">
                      METRO
                      <input
                        value={location.metro}
                        onChange={(event) => setForm({ ...form, product_shipping_locations: normalizedShippingLocations(form.product_shipping_locations).map((item) => item.state === location.state ? { ...item, metro: event.target.value } : item) })}
                        className="mt-2 w-full rounded-xl border border-black/10 bg-white p-3 outline-none transition focus:border-[#2479a8] focus:ring-2 focus:ring-[#2479a8]/15"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-3 text-sm font-semibold sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3">
                <input
                  className="h-4 w-4 accent-[#0b4166]"
                  type="checkbox"
                  checked={Boolean(form.featured)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      featured: e.target.checked,
                    })
                  }
                />{" "}
                Featured
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3">
                <input
                  className="h-4 w-4 accent-[#0b4166]"
                  type="checkbox"
                  checked={form.is_published !== false}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      is_published: e.target.checked,
                    })
                  }
                />{" "}
                Published
              </label>
            </div>

            {error && (
              <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            {galleryUploading && galleryProgress.total > 0 && (
              <div className="mt-4 rounded-xl border border-[#2479a8]/20 bg-[#eef7fb] p-3 text-sm text-[#0b4166]" aria-live="polite">
                <div className="flex items-center justify-between gap-3 font-bold">
                  <span>Uploading gallery originals...</span>
                  <span>{Math.round((galleryProgress.uploaded / galleryProgress.total) * 100)}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#c9dfe9]">
                  <div className="h-full bg-[#2479a8] transition-[width]" style={{ width: `${Math.min(100, (galleryProgress.uploaded / galleryProgress.total) * 100)}%` }} />
                </div>
              </div>
            )}

            <button disabled={saving || uploading || galleryUploading} className="trinity-button trinity-button-primary mt-6 flex min-h-12 w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50">
              {saving || galleryUploading ? "Saving product and gallery..." : "Save product"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}   

