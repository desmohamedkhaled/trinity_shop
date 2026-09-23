import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { OccasionCard } from "@/components/occasion-card";
import { getOccasionsResult } from "@/lib/catalog";

export default async function OccasionsPage() {
  const occasionsResult = await getOccasionsResult();
  const occasions = occasionsResult.data;

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen px-5 py-14 md:py-16">
        <div className="mx-auto max-w-[1440px]">
          <section className="store-panel px-6 py-12 text-center md:px-12 md:py-16">
            <p className="text-xs font-bold uppercase tracking-[.28em] text-[#b48d55]">Shop by occasion</p>
            <h1 className="display-font mt-3 text-5xl leading-tight md:text-7xl">Gifts for every meaningful moment</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-black/60 md:text-lg">
              Find a thoughtful Christian gift for the occasion you are celebrating.
            </p>
          </section>

          {occasionsResult.error ? <section role="alert" className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-10 text-center text-red-800">{occasionsResult.error} <Link href="/occasions" className="font-bold underline">Try again</Link></section> : occasions.length > 0 ? (
            <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              {occasions.map((occasion) => (
                <OccasionCard key={occasion.slug} item={occasion} />
              ))}
            </section>
          ) : (
            <section className="mt-10 rounded-2xl border border-black/10 bg-white/85 p-10 text-center shadow-sm">
              <h2 className="display-font text-3xl">No occasions available yet</h2>
              <p className="mt-3 text-sm text-black/55">Please check back soon while the collection is being prepared.</p>
            </section>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
