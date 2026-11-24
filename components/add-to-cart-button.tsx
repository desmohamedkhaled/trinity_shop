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
<<<<<<< HEAD
  const preorderEligible = comingSoon && product.preorder_eligible === true;
  const depositPercentage = preorderEligible
    ? Math.max(1, Math.min(100, Number(product.deposit_percentage ?? 50)))
    : 0;
  const photoMode = (product.inventory_mode === "photo" || variant?.inventory_mode === "photo")
    && Boolean(variant ? variant.images?.length : product.gallery?.length);
  const stockAvailable = variant ? variant.stock > 0 : (product.stock ?? 0) > 0;
  const available = comingSoon
    ? Boolean(preorder ? (variant?.price ?? product.price) >= 0 : true)
    : photoMode
      ? Boolean(image && (image.available_quantity ?? 0) > 0)
      : stockAvailable;
=======
  const photoMode = product.inventory_mode === "photo" || variant?.inventory_mode === "photo";
  const baseStock = variant ? variant.stock : product.stock ?? 0;
  // When a specific photo is chosen, use its quantity; otherwise fall back to product/variant stock.
  const inStock = photoMode && image ? (image.available_quantity ?? 0) > 0 : baseStock > 0;
  const available = comingSoon
    ? Boolean(preorder ? (variant?.price ?? product.price) >= 0 : true)
    : inStock && product.stock_status !== "Out of stock";
>>>>>>> 02e8a5562de6ded9c3951424375a9b5cd2b14da4
  function add() {
    if (!available) return;
    if (preorderEligible && preorder) {
      const price = variant?.price ?? product.price;
      const deposit = Math.round(price * depositPercentage) / 100;
      addToCart(product, variant, image, { is_deposit: true, deposit_percentage: depositPercentage, remaining_balance: Math.round((price - deposit) * 100) / 100 });
    } else if (comingSoon) {
      addToCart(product, variant, image, { is_deposit: false, deposit_percentage: 0, remaining_balance: 0 });
    } else {
      addToCart(product, variant, image);
    }
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }
  const label = comingSoon
    ? preorderEligible && preorder
      ? `Reserve with ${depositPercentage}% Deposit — ${formatAUD(Math.round((variant?.price ?? product.price) * depositPercentage) / 100)}`
      : "Add to cart"
    : !available
      ? "Out of stock"
      : added
        ? "Added to cart"
        : "Add to cart";
  return <button onClick={add} disabled={!available} aria-disabled={!available} className={`trinity-button trinity-button-primary inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 ${compact ? "min-h-10 px-3 text-xs" : "min-h-12 px-6 text-sm"}`}><span>{added ? <Check size={16} /> : <ShoppingCart size={16} />}</span>{label}</button>;
}
