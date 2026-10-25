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

function SpecificationIcon({ type }: { type: "length" | "width" | "height" | "weight" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 40 40" className="h-7 w-7 shrink-0 text-[#8f3b3b]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
      {type === "length" && (
        <>
          <path d="M7 20h26M7 20l4-4M7 20l4 4M33 20l-4-4M33 20l-4 4M13 13v14M27 13v14" />
        </>
      )}
      {type === "width" && (
        <>
          <path d="M9 13h22l-4-4M31 13l-4 4M9 13l4-4M9 13l4 4M9 13v14h22V13" />
          <path d="M15 17v6M20 17v4M25 17v6" />
        </>
      )}
      {type === "height" && (
        <>
          <path d="M20 7v26M20 7l-4 4M20 7l4 4M20 33l-4-4M20 33l4-4M13 13h14M13 27h14" />
        </>
      )}
      {type === "weight" && (
        <>
          <circle cx="20" cy="8" r="3" />
          <path d="M15 12h10l8 19H7l8-19Z" />
          <text x="20" y="26" fill="currentColor" stroke="none" textAnchor="middle" fontSize="8" fontWeight="700">KG</text>
        </>
      )}
    </svg>
  );
}

export function ProductDetail({ product }: { product: Product }) {
  const [selectedId, setSelectedId] = useState(product.variants?.[0]?.id || "");
  const variant = useMemo<ProductVariant | undefined>(
    () => product.variants?.find((item) => item.id === selectedId),
    [product.variants, selectedId],
  );
  const optionImages = variant?.images?.filter((image) => (image.available_quantity ?? 0) > 0) ?? [];
  const displayProduct = variant
    ? {
      ...product,
      price: variant.price,
      length: variant.length,
      width: variant.width,
      height: variant.height,
      weight: variant.weight,
      image: optionImages[0]?.image_url ?? "",
      gallery: optionImages,
    }
    : product;
  const allDepleted = product.variants?.length
    ? product.variants.every((item) => item.stock <= 0)
    : (product.stock ?? 0) <= 0;
  const comingSoon = isComingSoonProduct(product);
  const specifications = [
    { label: "Length", value: valueWithUnit(displayProduct.length, "cm"), icon: "length" as const },
    { label: "Width", value: valueWithUnit(displayProduct.width, "cm"), icon: "width" as const },
    { label: "Height", value: valueWithUnit(displayProduct.height, "cm"), icon: "height" as const },
    { label: "Weight", value: valueWithUnit(displayProduct.weight, "kg"), icon: "weight" as const },
  ].filter((item) => item.value);

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
        {specifications.length > 0 && (
          <dl className="mt-5 grid grid-cols-2 gap-x-3 gap-y-3 border-y border-black/10 py-3 sm:grid-cols-4" aria-label="Product specifications">
            {specifications.map(({ label, value, icon }) => (
              <div key={label} className="flex min-w-0 items-center gap-2">
                <SpecificationIcon type={icon} />
                <div className="min-w-0">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-black/45">{label}</dt>
                  <dd className="text-sm font-semibold text-[#083b68]">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
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
