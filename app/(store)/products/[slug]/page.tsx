import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { getProduct } from "@/lib/catalog";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductDetail } from "@/components/product-detail";

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

          <ProductDetail product={product} />
        </div>
      </main>
      

      <SiteFooter />
    </>
  );
}
