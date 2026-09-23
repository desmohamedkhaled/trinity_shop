"use client";

import { Check, ShoppingCart } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/lib/data";
import { useStore } from "@/components/store-provider";

export function AddToCartButton({ product, compact = false }: { product: Product; compact?: boolean }) {
  const { addToCart } = useStore();
  const [added, setAdded] = useState(false);
  function add() { addToCart(product); setAdded(true); window.setTimeout(() => setAdded(false), 1800); }
  return <button onClick={add} className={`trinity-button trinity-button-primary inline-flex items-center justify-center gap-2 ${compact ? "min-h-10 px-3 text-xs" : "min-h-12 px-6 text-sm"}`}><span>{added ? <Check size={16} /> : <ShoppingCart size={16} />}</span>{added ? "Added to cart" : "Add to cart"}</button>;
}
