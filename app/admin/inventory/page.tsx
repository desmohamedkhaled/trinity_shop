"use client";

import { useEffect, useState } from "react";

interface InventoryProduct {
  id: string;
  name: string;
  slug: string;
  stock: number;
  occasion?: string[] | null;
  is_published: boolean;
  updated_at?: string;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [filter, setFilter] = useState("all");
  const [occasionOptions, setOccasionOptions] = useState<string[]>([]);
  const [occasionFilter, setOccasionFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/products", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load inventory");
      setProducts(Array.isArray(data) ? data : []);
      const occasionsResponse = await fetch("/api/admin/occasions", { cache: "no-store" });
      const occasionsData = occasionsResponse.ok ? await occasionsResponse.json() : [];
      setOccasionOptions(Array.isArray(occasionsData) ? occasionsData.filter((item) => item?.name).map((item) => item.name) : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load inventory");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function updateStock(product: InventoryProduct, value: string) {
    const stock = Number(value);
    if (!Number.isInteger(stock) || stock < 0) return;
    setSaving(product.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update stock");
      setProducts((current) => current.map((item) => item.id === product.id ? { ...item, stock: data.stock, updated_at: data.updated_at } : item));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not update stock");
    } finally {
      setSaving(null);
    }
  }

  const visible = products.filter((product) => {
    const matchesStock = filter === "all" || (filter === "out" ? product.stock === 0 : filter === "low" ? product.stock > 0 && product.stock <= 5 : product.stock > 5);
    const matchesOccasion = occasionFilter === "all" || (Array.isArray(product.occasion) && product.occasion.includes(occasionFilter));
    return matchesStock && matchesOccasion;
  });

  return <div className="p-6 md:p-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-black/45">Store</p><h1 className="text-4xl font-black">Inventory</h1><p className="mt-2 text-sm text-black/50">Manage stock from the live products table.</p></div><div className="flex flex-wrap gap-3"><label className="flex items-center gap-2 text-sm font-bold text-[#5d3b2a]"><span className="sr-only">Filter inventory by occasion</span><select value={occasionFilter} onChange={(event) => setOccasionFilter(event.target.value)} className="rounded-xl border border-[#d9c6b0] bg-[#fffdf8] px-4 py-3 text-sm font-semibold text-[#5d3b2a]"><option value="all">All Occasions</option>{occasionOptions.map((occasion) => <option key={occasion} value={occasion}>{occasion}</option>)}</select></label><select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-xl border border-[#d9c6b0] bg-[#fffdf8] px-4 py-3 text-sm font-semibold text-[#5d3b2a]"><option value="all">All stock</option><option value="out">Out of stock</option><option value="low">Low stock</option><option value="in">In stock</option></select></div></div>{error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}<div className="mt-8 overflow-x-auto rounded-2xl border border-black/10 bg-white shadow-sm"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-[#f5f6f7]"><tr><th className="p-4">Product</th><th>Status</th><th>Stock</th><th>Published</th><th>Last updated</th></tr></thead><tbody>{loading ? <tr><td colSpan={5} className="p-10 text-center text-black/50">Loading inventory...</td></tr> : visible.length === 0 ? <tr><td colSpan={5} className="p-10 text-center text-black/50">No inventory records match this filter.</td></tr> : visible.map((product) => { const status = product.stock === 0 ? "Out of stock" : product.stock <= 5 ? "Low stock" : "In stock"; return <tr key={product.id} className="border-t"><td className="p-4 font-bold">{product.name}<div className="text-xs font-normal text-black/40">{product.slug}</div></td><td><span className={`rounded-full px-3 py-1 text-xs font-bold ${product.stock === 0 ? "bg-red-100 text-red-700" : product.stock <= 5 ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-700"}`}>{status}</span></td><td><input type="number" min="0" value={product.stock} disabled={saving === product.id} onChange={(event) => updateStock(product, event.target.value)} className="w-24 rounded-lg border px-3 py-2 disabled:opacity-50" /></td><td>{product.is_published ? "Published" : "Draft"}</td><td className="text-xs text-black/50">{product.updated_at ? new Date(product.updated_at).toLocaleString() : "—"}</td></tr>; })}</tbody></table></div></div>;
}
