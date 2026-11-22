"use client";

import { Check, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { isComingSoonProduct, type Product, type ProductImage, type ProductVariant } from "@/lib/data";
import { useStore } from "@/components/store-provider";
import { formatAUD } from "@/lib/currency";

export function AddToCartButton({ product, variant, image, compact = false, preorder = false }: { product: Product; variant?: ProductVariant; image?: ProductImage; compact?: boolean; preorder?: boolean }) {
  const { addToCart } = useStore();
  const [added, setAdded] = useState(false);
  const comingSoon = isComingSoonProduct(product);
  const photoMode = product.inventory_mode === "photo" || variant?.inventory_mode === "photo";
  const baseStock = variant ? variant.stock : product.stock ?? 0;
  // When a specific photo is chosen, use its quantity; otherwise fall back to product/variant stock.
  const inStock = photoMode && image ? (image.available_quantity ?? 0) > 0 : baseStock > 0;
  const available = comingSoon
    ? Boolean(preorder ? (variant?.price ?? product.price) >= 0 : true)
    : inStock && product.stock_status !== "Out of stock";
  function add() {
    if (!available) return;
    if (comingSoon && preorder) {
      const price = variant?.price ?? product.price;
      const deposit = Math.round(price * 100 * 0.5) / 100;
      addToCart(product, variant, image, { is_deposit: true, deposit_percentage: 50, remaining_balance: Math.round((price - deposit) * 100) / 100 });
    } else if (comingSoon) {
      addToCart(product, variant, image, { is_deposit: false, deposit_percentage: 0, remaining_balance: 0 });
    } else {
      addToCart(product, variant, image);
    }
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }
  const label = comingSoon
    ? preorder
      ? `Reserve with 50% Deposit — ${formatAUD(Math.round((variant?.price ?? product.price) * 100 * 0.5) / 100)}`
      : `Pay Full Amount — ${formatAUD(variant?.price ?? product.price)}`
    : !available
      ? "Out of stock"
      : added
        ? "Added to cart"
        : "Add to cart";
  return <button onClick={add} disabled={!available} aria-disabled={!available} className={`trinity-button trinity-button-primary inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 ${compact ? "min-h-10 px-3 text-xs" : "min-h-12 px-6 text-sm"}`}><span>{added ? <Check size={16} /> : <ShoppingCart size={16} />}</span>{label}</button>;
}
