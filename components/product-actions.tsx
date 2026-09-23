"use client";

import { Heart } from "lucide-react";

import type { Product } from "@/lib/data";

import { useStore } from "@/components/store-provider";

import { AddToCartButton } from "@/components/add-to-cart-button";

export function ProductActions({ product }: { product: Product }) {
  const { toggleGiftList, isInGiftList } = useStore();

  return (
    <div className="flex flex-wrap gap-3">
      <AddToCartButton product={product} />

      <button
        onClick={() => toggleGiftList(product)}
        className="rounded-full border border-black/15 p-4"
        aria-label={
          isInGiftList(product.id) ? "Saved for later" : "Save for later"
        }
        title="Save for later"
      >
        <Heart
          fill={isInGiftList(product.id) ? "#b84835" : "none"}
          color={isInGiftList(product.id) ? "#b84835" : "currentColor"}
        />
      </button>
    </div>
  );
}