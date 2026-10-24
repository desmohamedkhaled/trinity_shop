"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { isComingSoonProduct, type Product, type ProductVariant } from "@/lib/data";
import { formatAUD } from "@/lib/currency";
import { ProductActions } from "@/components/product-actions";
import { ProductGallery } from "@/components/product-gallery";

function valueWithUnit(value: number | null | undefined, unit: string) {
  return value === null || value === undefined ? null : `${value} ${unit}`;
}

export function ProductDetail({ product }: { product: Product }) {
  const [selectedId, setSelectedId] = useState(product.variants?.[0]?.id || "");
  const variant = useMemo<ProductVariant | undefined>(
    () => product.variants?.find((item) => item.id === selectedId),
    [product.variants, selectedId],
  );
  const displayProduct = variant
    ? { ...product, price: variant.price, length: variant.length, width: variant.width, height: variant.height, weight: variant.weight, gallery: variant.images || product.gallery }
    : product;
  const allDepleted = product.variants?.length
    ? product.variants.every((item) => item.stock <= 0)
    : (product.stock ?? 0) <= 0;
  const comingSoon = isComingSoonProduct(product);
  const dimensions = [
    ["Length", valueWithUnit(displayProduct.length, "cm")],
    ["Width", valueWithUnit(displayProduct.width, "cm")],
    ["Height", valueWithUnit(displayProduct.height, "cm")],
    ["Weight", valueWithUnit(displayProduct.weight, "kg")],
  ].filter(([, value]) => value);

  return (
    <div className="mt-7 grid gap-10 lg:grid-cols-[minmax(0,1.45fr)_minmax(22rem,.85fr)] lg:items-start lg:gap-12 xl:gap-16">
      <ProductGallery product={displayProduct} />
      <div className="flex min-w-0 flex-col justify-center">
        <p className="text-xs font-bold uppercase tracking-[.25em] text-[#b48d55]">{product.category}</p>
        {comingSoon && <span className="mt-4 inline-flex w-fit rounded-full bg-[#b48d55] px-4 py-2 text-xs font-bold uppercase tracking-[.18em] text-white">Coming Soon</span>}
        {allDepleted && <span className="mt-4 inline-flex w-fit rounded-full bg-black/10 px-4 py-2 text-xs font-bold uppercase tracking-[.18em] text-black/65">Out of stock</span>}
        <h1 className="display-font mt-3 text-5xl leading-tight md:text-6xl xl:text-7xl">{product.name}</h1>
        {product.variants && product.variants.length > 0 && (
          <label className="mt-6 text-sm font-bold">
            Size / design
            <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-2 w-full rounded-xl border border-black/10 bg-white p-3">
              {product.variants.map((item) => <option key={item.id} value={item.id}>{item.name} - {formatAUD(item.price)} ({item.stock} available)</option>)}
            </select>
          </label>
        )}
        <p className="mt-5 text-2xl font-bold text-[#083b68] md:text-3xl">{formatAUD(displayProduct.price)}</p>
        <p className="mt-6 text-lg leading-8 text-black/60">{product.description}</p>
        {dimensions.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3 border-y border-black/10 py-5" aria-label="Product dimensions">
            {dimensions.map(([label, value]) => <div key={label}><dt className="text-xs font-bold uppercase tracking-widest text-black/45">{label}</dt><dd className="mt-1 font-semibold text-[#083b68]">{value}</dd></div>)}
          </div>
        )}
        {product.meaning?.trim() && (
          <div className="store-panel mt-8 p-6 md:p-7">
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest"><Sparkles size={16} /> The meaning</p>
            <p className="mt-3 leading-7 text-black/65">{product.meaning}</p>
          </div>
        )}
        <div className="mt-8"><ProductActions product={product} variant={variant} /></div>
        <p className="mt-4 text-xs text-black/45">Request this gift and the Trinity team will contact you to confirm details.</p>
      </div>
    </div>
  );
}
