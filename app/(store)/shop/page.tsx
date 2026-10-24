import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductCard } from "@/components/product-card";
import { getProductsResult } from "@/lib/catalog";
import { isComingSoonProduct, type Product } from "@/lib/data";
import Link from "next/link";

type ShopSearchParams = {
  search?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: string;
  sort?: string;
};

function parsePrice(value?: string) {
  if (!value?.trim()) return undefined;
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : undefined;
}

function startingPrice(product: Product) {
  return product.variants?.length
    ? Math.min(...product.variants.map((variant) => variant.price))
    : product.price;
}

function isAvailable(product: Product) {
  if (product.stock_status === "Out of stock" || isComingSoonProduct(product)) return false;
  return product.variants?.length
    ? product.variants.some((variant) => variant.stock > 0)
    : (product.stock ?? 0) > 0;
}

export default async function Shop({ searchParams }: { searchParams: Promise<ShopSearchParams> }) {
  const params = await searchParams;
  const productsResult = await getProductsResult();
  const products = productsResult.data;
  const searchValue = params.search?.trim() || "";
  const search = searchValue.toLocaleLowerCase();
  const category = params.category || "All";
  const minPrice = parsePrice(params.minPrice);
  const maxPrice = parsePrice(params.maxPrice);
  const inStockOnly = params.inStock === "1";
  const sort = ["price-asc", "price-desc", "name"].includes(params.sort || "") ? params.sort! : "recent";
  const categoryLabels = new Map<string, string>();
  for (const product of products) {
    const label = product.category?.trim().replace(/\s+/g, " ");
    if (!label) continue;
    const key = label.toLocaleLowerCase();
    const current = categoryLabels.get(key);
    if (!current || (current === current.toLocaleLowerCase() && label !== label.toLocaleLowerCase())) {
      categoryLabels.set(key, label);
    }
  }
  const categories = ["All", ...Array.from(categoryLabels.values()).sort((a, b) => a.localeCompare(b))];
  const selectedCategory = category.trim().toLocaleLowerCase();
  const showAllCategories = !params.category || selectedCategory === "all";
  const hasActiveFilters = !showAllCategories || Boolean(searchValue || params.minPrice || params.maxPrice || inStockOnly || params.sort);
  const filteredProducts = products.filter((product) => {
    const matchesCategory = showAllCategories || product.category.trim().toLocaleLowerCase() === selectedCategory;
    const haystack = `${product.name} ${product.category} ${product.description} ${product.meaning}`.toLowerCase();
    const price = startingPrice(product);
    const matchesPrice = (minPrice === undefined || price >= minPrice) && (maxPrice === undefined || price <= maxPrice);
    const matchesAvailability = !inStockOnly || isAvailable(product);
    return matchesCategory && matchesPrice && matchesAvailability && (!search || haystack.includes(search));
  });
  if (sort === "price-asc") filteredProducts.sort((left, right) => startingPrice(left) - startingPrice(right));
  if (sort === "price-desc") filteredProducts.sort((left, right) => startingPrice(right) - startingPrice(left));
  if (sort === "name") filteredProducts.sort((left, right) => left.name.localeCompare(right.name));
  const invalidPriceRange = minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice;

  return <><SiteHeader/><main className="px-5 py-14 md:py-16">
    <div className="mx-auto max-w-[1440px]">
      <div className="px-4 py-10 text-center md:py-12">
        <p className="text-xs font-bold uppercase tracking-[.28em] text-[#b48d55]">The collection</p>
        <h1 className="display-font mt-3 text-6xl">Shop meaningful gifts</h1>
        <p className="mx-auto mt-5 max-w-xl text-black/60">Browse the current collection of meaningful gifts.</p>
      </div>
      <section className="mt-10 border-y border-[#d8c5b2]/70 py-5" aria-label="Product filters">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xs font-bold uppercase tracking-[.2em] text-[#8a6a48]">Refine results</h2>
          {hasActiveFilters && <Link href="/shop" className="text-sm font-semibold text-[#5d3b2a] underline-offset-4 hover:underline">Clear filters</Link>}
        </div>
        <form action="/shop" method="get" className="grid grid-cols-2 gap-3 sm:grid-cols-6 xl:grid-cols-12">
          <label className="col-span-2 text-xs font-semibold text-[#3a2b22] sm:col-span-2 xl:col-span-3">
            Search
            <input name="search" type="search" defaultValue={searchValue} placeholder="Name or keyword" className="mt-1.5 min-h-11 w-full rounded-lg border border-[#d8c5b2] bg-white px-3 text-sm outline-none transition focus:border-[#8a6a48] focus:ring-2 focus:ring-[#b48d55]/20" />
          </label>
          <label className="col-span-2 text-xs font-semibold text-[#3a2b22] sm:col-span-2 xl:col-span-2">
            Category
            <select name="category" defaultValue={showAllCategories ? "All" : categoryLabels.get(selectedCategory) || category} className="mt-1.5 min-h-11 w-full rounded-lg border border-[#d8c5b2] bg-white px-3 text-sm outline-none transition focus:border-[#8a6a48] focus:ring-2 focus:ring-[#b48d55]/20">
              {categories.map((categoryName) => <option key={categoryName} value={categoryName}>{categoryName === "All" ? "All categories" : categoryName}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#3a2b22] sm:col-span-1 xl:col-span-1">
            Min price
            <input name="minPrice" type="number" min="0" step="0.01" defaultValue={params.minPrice || ""} placeholder="0" inputMode="decimal" className="mt-1.5 min-h-11 w-full rounded-lg border border-[#d8c5b2] bg-white px-3 text-sm outline-none transition focus:border-[#8a6a48] focus:ring-2 focus:ring-[#b48d55]/20" />
          </label>
          <label className="text-xs font-semibold text-[#3a2b22] sm:col-span-1 xl:col-span-1">
            Max price
            <input name="maxPrice" type="number" min="0" step="0.01" defaultValue={params.maxPrice || ""} placeholder="No limit" inputMode="decimal" className="mt-1.5 min-h-11 w-full rounded-lg border border-[#d8c5b2] bg-white px-3 text-sm outline-none transition focus:border-[#8a6a48] focus:ring-2 focus:ring-[#b48d55]/20" />
          </label>
          <label className="col-span-2 text-xs font-semibold text-[#3a2b22] sm:col-span-2 xl:col-span-2">
            Sort by
            <select name="sort" defaultValue={sort} className="mt-1.5 min-h-11 w-full rounded-lg border border-[#d8c5b2] bg-white px-3 text-sm outline-none transition focus:border-[#8a6a48] focus:ring-2 focus:ring-[#b48d55]/20">
              <option value="recent">Recently added</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="name">Name: A to Z</option>
            </select>
          </label>
          <label className="col-span-2 flex min-h-11 items-center gap-2 text-sm font-semibold text-[#3a2b22] sm:col-span-3 xl:col-span-2">
            <input name="inStock" type="checkbox" value="1" defaultChecked={inStockOnly} className="h-4 w-4 accent-[#5d3b2a]" />
            In stock only
          </label>
          <button type="submit" className="col-span-2 min-h-11 rounded-lg bg-[#5d3b2a] px-4 text-sm font-bold text-white transition hover:bg-[#472d23] sm:col-span-3 xl:col-span-1">Apply</button>
        </form>
      </section>
      {productsResult.error ? <div role="alert" className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-10 text-center text-red-800">{productsResult.error} <Link href="/shop" className="font-bold underline">Try again</Link></div> : <>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-2 text-sm text-black/55">
        <p>{filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"}</p>
        {minPrice !== undefined || maxPrice !== undefined ? <p>Prices shown in AUD</p> : null}
      </div>
      {invalidPriceRange && <p role="alert" className="mt-4 text-sm font-semibold text-red-700">Minimum price must be less than or equal to maximum price.</p>}
      <div className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">{filteredProducts.map(p=><ProductCard key={p.id} product={p}/>)}</div>
      {!filteredProducts.length && <div className="mt-10 rounded-lg border border-[#d8c5b2]/70 bg-white/70 p-10 text-center text-black/55">No products match these filters.</div>}</>}
    </div>
  </main><SiteFooter/></>;
}
