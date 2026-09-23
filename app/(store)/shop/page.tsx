import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductCard } from "@/components/product-card";
import { getProductsResult } from "@/lib/catalog";
import Link from "next/link";

export default async function Shop({ searchParams }: { searchParams: Promise<{ search?: string; category?: string }> }) {
  const params = await searchParams;
  const productsResult = await getProductsResult();
  const products = productsResult.data;
  const search = params.search?.trim().toLowerCase() || "";
  const category = params.category || "All";
  const categories = ["All", ...Array.from(new Set(products.map((product) => product.category).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b))];
  const filteredProducts = products.filter((product) => {
    const matchesCategory = category === "All" || product.category === category;
    const haystack = `${product.name} ${product.category} ${product.description} ${product.meaning}`.toLowerCase();
    return matchesCategory && (!search || haystack.includes(search));
  });

  return <><SiteHeader/><main className="px-5 py-14 md:py-16">
    <div className="mx-auto max-w-[1440px]">
      <div className="px-4 py-10 text-center md:py-12">
        <p className="text-xs font-bold uppercase tracking-[.28em] text-[#b48d55]">The collection</p>
        <h1 className="display-font mt-3 text-6xl">Shop meaningful gifts</h1>
        <p className="mx-auto mt-5 max-w-xl text-black/60">Browse the current collection of meaningful gifts.</p>
      </div>
      <div className="mt-10 flex flex-nowrap gap-2 overflow-x-auto pb-2 md:flex-wrap md:overflow-visible md:pb-0">
        {categories.map((categoryName) => {
          const active = category === categoryName;
          const query = new URLSearchParams();
          if (search) query.set("search", search);
          if (categoryName !== "All") query.set("category", categoryName);
          const href = query.toString() ? `/shop?${query.toString()}` : "/shop";
          return <Link key={categoryName} href={href} className={`shrink-0 rounded-full px-5 py-2 text-sm font-semibold transition ${active ? "bg-[#5d3b2a] text-white shadow-sm" : "border border-[#d8c5b2] bg-[#fffdf8] text-[#3a2b22] hover:border-[#b48d55] hover:text-[#5d3b2a]"}`}>{categoryName}</Link>;
        })}
      </div>
      {productsResult.error ? <div role="alert" className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-10 text-center text-red-800">{productsResult.error} <Link href="/shop" className="font-bold underline">Try again</Link></div> : <><div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">{filteredProducts.map(p=><ProductCard key={p.id} product={p}/>)}</div>
      {!filteredProducts.length && <div className="mt-10 rounded-2xl border bg-white/70 p-10 text-center text-black/55">No products match your search.</div>}</>}
    </div>
  </main><SiteFooter/></>;
}
