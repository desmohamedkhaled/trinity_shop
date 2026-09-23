"use client";

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { useStore } from "@/components/store-provider";
import { WhatsAppCheckout } from "@/components/whatsapp-checkout";
import type { Product } from "@/lib/data";

export default function GiftList() {
  const { giftList, quantities, setQuantity, removeFromGiftList, clearGiftList } = useStore();
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/catalog/products", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load wishlist products");
        if (active) setCatalog(Array.isArray(data) ? data : []);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load wishlist products");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const favoriteIds = new Set(giftList.map((product) => product.id));
  const products = catalog.filter((product) => favoriteIds.has(product.id));
  const items = products.map((product) => ({ product, quantity: quantities[product.id] || 1 }));

  return (
    <>
      <SiteHeader />
      <main className="store-page min-w-0">
        <div className="trinity-container py-14 md:py-20">
          <p className="eyebrow text-[#b48d55]">Your collection</p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="display-font mt-2 text-5xl md:text-6xl">Wishlist</h1>
              <p className="mt-3 max-w-xl text-black/55">Keep the gifts that feel meaningful close at hand.</p>
            </div>
            {products.length > 0 && <span className="rounded-full bg-[#083b68] px-4 py-2 text-sm font-bold text-white">{products.length} {products.length === 1 ? "gift" : "gifts"}</span>}
          </div>

          {error && <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700" role="alert">{error}</div>}
          {loading ? (
            <div className="mt-10 rounded-2xl border border-black/10 bg-white p-10 text-center text-sm text-black/50">Loading your wishlist...</div>
          ) : products.length === 0 ? (
            <div className="pattern-bg mt-10 rounded-[30px] p-10 text-center md:p-16">
              <p className="text-lg font-bold text-[#083b68]">Your wishlist is empty.</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-black/55">Tap the heart on any gift to save it here for later.</p>
              <Link href="/shop" className="mt-6 inline-flex rounded-full bg-[#083b68] px-6 py-3 font-bold text-white transition hover:bg-[#1267a8]">Explore gifts</Link>
            </div>
          ) : (
            <>
            <div className="mt-10 grid min-w-0 gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              {products.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
            <div className="mt-10 grid gap-3 rounded-2xl border border-black/10 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold">Request your saved gifts</h2>
                <button onClick={clearGiftList} className="text-sm font-semibold text-black/45 underline">Clear wishlist</button>
              </div>
              {items.map(({ product, quantity }) => <div key={product.id} className="flex min-w-0 flex-wrap items-center gap-3 border-t border-black/10 pt-3"><span className="min-w-0 flex-1 truncate text-sm font-semibold">{product.name}</span><div className="inline-flex items-center rounded-xl border bg-white"><button onClick={() => setQuantity(product.id, quantity - 1)} className="p-2" aria-label={`Decrease ${product.name} quantity`}><Minus size={15} /></button><span className="min-w-8 text-center text-sm font-bold">{quantity}</span><button onClick={() => setQuantity(product.id, quantity + 1)} className="p-2" aria-label={`Increase ${product.name} quantity`}><Plus size={15} /></button></div><button onClick={() => removeFromGiftList(product.id)} className="rounded-full p-2 text-black/45 hover:bg-red-50 hover:text-red-700" aria-label={`Remove ${product.name} from wishlist`}><Trash2 size={17} /></button></div>)}
              <div className="pt-2"><WhatsAppCheckout items={items} onClear={clearGiftList} /></div>
            </div>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
