"use client";

import { Check, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { isComingSoonProduct, type Product, type ProductVariant } from "@/lib/data";
import { useStore } from "@/components/store-provider";

export function AddToCartButton({ product, variant, compact = false }: { product: Product; variant?: ProductVariant; compact?: boolean }) {
  const { addToCart } = useStore();
  const [added, setAdded] = useState(false);
  const comingSoon = isComingSoonProduct(product);
  const available = !comingSoon && (variant ? variant.stock : product.stock ?? 0) > 0 && product.stock_status !== "Out of stock";
  function add() { if (!available) return; addToCart(product, variant); setAdded(true); window.setTimeout(() => setAdded(false), 1800); }
  return <button onClick={add} disabled={!available} aria-disabled={!available} className={`trinity-button trinity-button-primary inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 ${compact ? "min-h-10 px-3 text-xs" : "min-h-12 px-6 text-sm"}`}><span>{added ? <Check size={16} /> : <ShoppingCart size={16} />}</span>{comingSoon ? "Coming Soon" : !available ? "Out of stock" : added ? "Added to cart" : "Add to cart"}</button>;
}
