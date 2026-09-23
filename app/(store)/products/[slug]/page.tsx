import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";

import { getProduct } from "@/lib/catalog";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductActions } from "@/components/product-actions";
import { ProductGallery } from "@/components/product-gallery";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  return (
    <>
      <SiteHeader />

      <main className="store-page">
        <div className="product-container">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-sm font-semibold text-black/50 transition-colors hover:text-[#083b68]"
          >
            <ArrowLeft size={16} />
            Back to shop
          </Link>

          <div className="mt-7 grid gap-10 lg:grid-cols-[minmax(0,1.45fr)_minmax(22rem,.85fr)] lg:items-start lg:gap-12 xl:gap-16">
            {/* Product Gallery */}
            <ProductGallery product={product} />

            {/* Product Information */}
            <div className="flex min-w-0 flex-col justify-center">
              <p className="text-xs font-bold uppercase tracking-[.25em] text-[#b48d55]">
                {product.category}
              </p>

              {product.featured && (
                <span className="mt-4 inline-flex w-fit rounded-full bg-[#083b68] px-4 py-2 text-xs font-bold uppercase tracking-[.18em] text-white shadow-sm">
                  Featured
                </span>
              )}

              <h1 className="display-font mt-3 text-5xl leading-tight md:text-6xl xl:text-7xl">
                {product.name}
              </h1>

              <p className="mt-5 text-2xl font-bold text-[#083b68] md:text-3xl">
                ${product.price}
              </p>

              <p className="mt-6 text-lg leading-8 text-black/60">
                {product.description}
              </p>

              <div className="store-panel mt-8 p-6 md:p-7">
                <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
                  <Sparkles size={16} />
                  The meaning
                </p>

                <p className="mt-3 leading-7 text-black/65">
                  {product.meaning}
                </p>
              </div>

              <div className="mt-8">
                <ProductActions product={product} />
              </div>

              <p className="mt-4 text-xs text-black/45">
                Request this gift and the Trinity team will contact you to
                confirm details.
              </p>
            </div>
          </div>
        </div>
      </main>
      

      <SiteFooter />
    </>
  );
}
