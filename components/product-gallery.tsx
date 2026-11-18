"use client";

import Image from "next/image";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Product, ProductImage } from "@/lib/data";

export function ProductGallery({ product }: { product: Product }) {
  const images = useMemo<ProductImage[]>(() => {
    const candidates: ProductImage[] = [
      {
        id: "cover",
        product_id: product.id,
        image_url: product.image,
        alt_text: product.name,
        sort_order: -1,
      },
      ...[...(product.gallery || [])].sort(
        (a, b) => a.sort_order - b.sort_order
      ),
    ];

    const seen = new Set<string>();

    return candidates.filter((image) => {
      const imageUrl = image.image_url?.trim();

      if (!imageUrl || seen.has(imageUrl)) {
        return false;
      }

      seen.add(imageUrl);

      return true;
    });
  }, [product.gallery, product.id, product.image, product.name]);

  const [selected, setSelected] = useState(0);

  const thumbnailRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const thumbnailScrollerRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);

  const current = images[selected] || images[0];

  const selectImage = (index: number) => {
    setSelected(Math.max(0, Math.min(index, images.length - 1)));
  };

  useEffect(() => {
    if (selected >= images.length) {
      setSelected(Math.max(0, images.length - 1));
    }
  }, [images.length, selected]);

  useEffect(() => {
    thumbnailRefs.current[selected]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [selected]);

  if (!current) {
    return null;
  }

  const previousImage = () => {
    selectImage((selected - 1 + images.length) % images.length);
  };

  const nextImage = () => {
    selectImage((selected + 1) % images.length);
  };

  const scrollThumbnails = (direction: "up" | "down") => {
    thumbnailScrollerRef.current?.scrollBy({
      top: direction === "up" ? -288 : 288,
      behavior: "smooth",
    });
  };

  const handleGalleryKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (images.length < 2) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      previousImage();
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      nextImage();
    }
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const startX = touchStartX.current;
    touchStartX.current = null;
    if (startX === null || images.length < 2) return;
    const distance = event.changedTouches[0].clientX - startX;
    if (Math.abs(distance) < 50) return;
    if (distance > 0) previousImage();
    else nextImage();
  };

  const thumbnails = (
    <div
      ref={thumbnailScrollerRef}
      className="
        flex
        min-h-0
        gap-3
        overflow-x-auto
        overscroll-x-contain
        pb-2
        md:h-full
        md:flex-col
        md:overflow-x-hidden
        md:overflow-y-auto
        md:pb-0
      "
      aria-label="Product gallery thumbnails"
    >
      {images.map((image, index) => (
        <button
          key={`${image.id}-${image.image_url}`}
          ref={(element) => {
            thumbnailRefs.current[index] = element;
          }}
          type="button"
          onClick={() => selectImage(index)}
          aria-label={`Show product image ${index + 1}`}
          aria-current={selected === index ? "true" : undefined}
          className={`
            relative
            h-20
            w-16
            shrink-0
            overflow-hidden
            rounded-[var(--trinity-radius-sm)]
            border-2
            bg-[#eadfce]
            transition
            md:h-20
            md:w-full
            lg:h-[4.5rem]

            ${
              selected === index
                ? "border-[#083b68] ring-2 ring-[#083b68]/20"
                : "border-transparent hover:border-[#2479a8]"
            }
          `}
        >
          <Image
            src={image.image_url}
            alt={
              image.alt_text ||
              `${product.name} thumbnail ${index + 1}`
            }
            fill
            sizes="(max-width: 767px) 64px, (max-width: 1279px) 90px, 110px"
            className="object-cover"
            loading={index === 0 ? "eager" : "lazy"}
          />
        </button>
      ))}
    </div>
  );

  return (
    <div
      className="min-w-0"
      aria-label={`${product.name} image gallery`}
    >
      <div
        className={`
          grid
          min-w-0
          gap-4
          md:items-stretch
          md:gap-5
          ${
            images.length > 1
              ? "md:grid-cols-[6rem_minmax(0,1fr)] lg:grid-cols-[6.5rem_minmax(0,1fr)]"
              : ""
          }
        `}
      >
        {/* Thumbnail Navigation */}
        {images.length > 1 && (
          <aside
            className="
              order-2
              flex
              min-w-0
              gap-2
              md:order-1
              md:h-full
              md:min-h-0
              md:flex-col
              lg:h-[46rem]
            "
            aria-label="Product image navigation"
          >
            <button
              type="button"
              onClick={() => scrollThumbnails("up")}
              className="
                hidden
                h-8
                shrink-0
                place-items-center
                rounded-full
                border
                border-black/10
                bg-white/70
                text-[#083b68]
                transition
                hover:bg-white
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-[#1267a8]
                md:grid
              "
              aria-label="Scroll thumbnails up"
              title="Scroll thumbnails up"
            >
              <ChevronUp size={17} />
            </button>

            <div className="min-h-0 min-w-0 flex-1 md:h-full">
              {thumbnails}
            </div>

            <button
              type="button"
              onClick={() => scrollThumbnails("down")}
              className="
                hidden
                h-8
                shrink-0
                place-items-center
                rounded-full
                border
                border-black/10
                bg-white/70
                text-[#083b68]
                transition
                hover:bg-white
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-[#1267a8]
                md:grid
              "
              aria-label="Scroll thumbnails down"
              title="Scroll thumbnails down"
            >
              <ChevronDown size={17} />
            </button>
          </aside>
        )}

        {/* Main Image */}
        <div
          className="order-1 min-w-0 md:order-2"
          tabIndex={images.length > 1 ? 0 : undefined}
          onKeyDown={handleGalleryKeyDown}
          onTouchStart={(event) => {
            touchStartX.current = event.touches[0].clientX;
          }}
          onTouchEnd={handleTouchEnd}
          aria-label={images.length > 1 ? "Product image. Use left and right arrow keys to change images." : undefined}
        >
          <div
            className="
              relative
              aspect-[4/5]
              min-h-[26rem]
              w-full
              overflow-hidden
              rounded-[var(--trinity-radius-lg)]
              bg-[#eadfce]
              shadow-[0_18px_45px_rgba(64,43,25,.12)]
              sm:min-h-[32rem]
              lg:min-h-[38rem]
              xl:min-h-[42rem]
            "
          >
            <Image
              src={current.image_url}
              alt={
                current.alt_text ||
                `${product.name} image ${selected + 1}`
              }
              fill
              priority={selected === 0}
              className="object-contain"
              sizes="(max-width: 767px) 100vw, (max-width: 1279px) 55vw, 60vw"
            />

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={previousImage}
                  aria-label="Previous product image"
                  className="
                    absolute
                    left-4
                    top-1/2
                    grid
                    h-11
                    w-11
                    -translate-y-1/2
                    place-items-center
                    rounded-full
                    border
                    border-black/10
                    bg-white/85
                    text-[#083b68]
                    shadow-md
                    backdrop-blur-sm
                    transition
                    hover:bg-white
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-[#1267a8]
                  "
                >
                  <ChevronLeft size={22} />
                </button>

                <button
                  type="button"
                  onClick={nextImage}
                  aria-label="Next product image"
                  className="
                    absolute
                    right-4
                    top-1/2
                    grid
                    h-11
                    w-11
                    -translate-y-1/2
                    place-items-center
                    rounded-full
                    border
                    border-black/10
                    bg-white/85
                    text-[#083b68]
                    shadow-md
                    backdrop-blur-sm
                    transition
                    hover:bg-white
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-[#1267a8]
                  "
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}
          </div>

          {images.length > 1 && (
            <p
              className="mt-3 text-center text-xs text-black/45"
              aria-live="polite"
            >
              Image {selected + 1} of {images.length}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
