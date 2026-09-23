"use client";

import Image from "next/image";
import Link from "next/link";
import { Eye, Heart, ZoomIn } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/data";
import { useStore } from "./store-provider";
import { AddToCartButton } from "./add-to-cart-button";
import { IconButton } from "@/components/icon-button";

export function ProductCard({ product }: { product: Product }) {
  const { toggleGiftList, isInGiftList } = useStore();
  const [zoomOpen, setZoomOpen] = useState(false);
  const zoomTriggerRef = useRef<HTMLButtonElement | null>(null);
  const zoomDialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!zoomOpen) return;
    const dialog = zoomDialogRef.current;
    const trigger = zoomTriggerRef.current;
    const close = () => setZoomOpen(false);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    dialog?.querySelector<HTMLElement>("button")?.focus();
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      trigger?.focus();
    };
  }, [zoomOpen]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      className="catalog-card group"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--trinity-radius-sm)] bg-[#eadfce]">
        <Link href={`/products/${product.slug}`} aria-label={`View ${product.name}`} className="block h-full w-full">
          <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.45, ease: "easeOut" }} className="relative h-full w-full">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover transition duration-700 group-hover:brightness-[0.94]"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          </motion.div>
        </Link>

        {product.featured && (
          <span className="absolute left-4 top-4 rounded-full bg-[#f6f0e7]/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#5d3b2a]">
            Featured
          </span>
        )}

        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 translate-x-0 flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/90 opacity-100 shadow-xl backdrop-blur-md transition-all duration-300 md:translate-x-2 md:opacity-0 md:group-hover:translate-x-0 md:group-hover:opacity-100 md:focus-within:translate-x-0 md:focus-within:opacity-100">
          <Link href={`/products/${product.slug}`} className="flex h-10 w-10 items-center justify-center hover:bg-[#f6f0e7]" aria-label={`View ${product.name}`}>
            <Eye size={18} />
          </Link>

          <IconButton
            label={`Zoom ${product.name}`}
            onClick={() => setZoomOpen(true)}
            ref={zoomTriggerRef}
            className="h-10 w-10 rounded-none border-t border-black/10 bg-transparent text-black/70"
          >
            <ZoomIn size={18} />
          </IconButton>

          <IconButton
            label={isInGiftList(product.id) ? "Remove from wishlist" : "Add to wishlist"}
            onClick={() => toggleGiftList(product)}
            active={isInGiftList(product.id)}
            className="h-10 w-10 rounded-none border-t border-black/10 bg-transparent text-black/70"
          >
            <Heart size={18} fill={isInGiftList(product.id) ? "currentColor" : "none"} />
          </IconButton>
        </div>
      </div>

      <div className="flex items-start justify-between gap-4 px-1 pt-4">
        <div>
          <p className="eyebrow text-[#b48d55]">{product.category}</p>
          <Link href={`/products/${product.slug}`} className="mt-1 block text-lg font-bold transition-colors duration-200 hover:text-[#5d3b2a]">
            {product.name}
          </Link>
          <p className="mt-1 max-w-xs text-sm text-black/55">{product.meaning}</p>
        </div>
        <span className="pt-1 text-base font-bold text-[#5d3b2a]">${product.price}</span>
      </div>

      <div className="mt-4 px-1">
        <AddToCartButton product={product} compact />
      </div>

      {zoomOpen && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setZoomOpen(false); }}>
          <div ref={zoomDialogRef} role="dialog" aria-modal="true" aria-label={`Zoomed image of ${product.name}`} className="relative h-[80vh] w-full max-w-3xl">
            <Image src={product.image} alt={product.name} fill className="object-contain" sizes="90vw" />
            <button
              onClick={() => setZoomOpen(false)}
              className="absolute right-3 top-3 rounded-full bg-white px-3 py-2 text-sm font-bold text-[#5d3b2a]"
              aria-label="Close zoom"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </motion.article>
  );
}
