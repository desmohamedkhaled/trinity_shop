import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductCard } from "@/components/product-card";
import { OccasionCard } from "@/components/occasion-card";
import { SectionTitle } from "@/components/section-title";
import { EventCard } from "@/components/event-card";
import { getOccasions, getProducts } from "@/lib/catalog";
import { getHomepageUpcomingEvents } from "@/lib/events";

export default async function Home() {
  const [occasions, products, events] = await Promise.all([
    getOccasions(),
    getProducts(),
    getHomepageUpcomingEvents(4),
  ]);

  return (
    <>
      <SiteHeader />

      <main>
        {/* Hero Video */}
        <section className="relative min-h-[76vh] overflow-hidden md:min-h-[82vh]">
          <video
          className="absolute inset-0 h-full w-full object-fill object-center"
            src="/video/Hero_Vid.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          />
        </section>

        {/* Shop by Occasion */}
        <section className="trinity-container py-20 md:py-24">
          <SectionTitle
            eyebrow="Shop by occasion"
            title="For every meaningful moment"
            text="Start with the reason you are giving. We will help you find something that feels personal."
          />

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {occasions.map((o) => (
              <OccasionCard key={o.slug} item={o} />
            ))}
          </div>
        </section>

        {/* Collection */}
        <section className="bg-[#fffaf3] py-20 md:py-24">
          <div className="trinity-container">
            <SectionTitle
              eyebrow="The collection"
              title="Gifts that carry a story"
              text="From quiet everyday reminders to milestone keepsakes."
            />

            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
              {products.slice(0, 4).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>

            <div className="mt-12 text-center">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 rounded-full border border-black/15 px-6 py-3 text-sm font-bold hover:bg-white"
              >
                View all gifts
                <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </section>

        {/* Trinity Story */}
        <section className="bg-[#f3e9dc] py-20 md:py-28">
          <div className="trinity-container grid max-w-6xl items-center gap-14 md:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.28em] text-[#b48d55]">
                The Trinity story
              </p>

              <h2 className="display-font mt-4 text-5xl md:text-6xl">
                More than a gift.
                <br />
                <i>A meaning.</i>
              </h2>

              <p className="mt-6 max-w-lg leading-8 text-black/60">
                Trinity is built around the idea that the best gifts do more
                than look beautiful. They remember a person, honor a
                milestone, or keep faith close to the heart.
              </p>

              <Link
                href="/our-story"
                className="mt-7 inline-flex items-center gap-2 font-bold text-[#5d3b2a] transition hover:text-[#472d23]"
              >
                Discover our story
                <ArrowRight size={17} />
              </Link>
            </div>

            <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-[40px] shadow-2xl">
              <Image
                src="https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1200&q=85"
                alt="Open Bible in warm light"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </section>

        {/* Events */}
        {events.length > 0 && (
          <section className="bg-[#fffaf3] py-20 md:py-24">
            <div className="trinity-container">
              <div className="mb-10 text-center">
                <p className="text-xs font-black uppercase tracking-[.28em] text-[#b48d55]">UPCOMING EVENTS</p>
                <h2 className="display-font mt-4 text-5xl leading-none md:text-6xl">Gather. Celebrate. Connect.</h2>
                <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-black/60">Discover upcoming moments of faith, fellowship, and celebration at Trinity.</p>
              </div>

              <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
                {events.slice(0, 3).map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>

              {events.length > 3 && (
                <div className="mt-10 text-center">
                  <Link href="/events" className="inline-flex items-center gap-2 rounded-full border border-[#5d3b2a] px-7 py-4 text-sm font-black uppercase tracking-[.18em] text-[#5d3b2a] transition hover:bg-[#5d3b2a] hover:text-white">
                    View All Events
                    <ArrowRight size={16} />
                  </Link>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Gift Finder */}
        <section className="bg-[#5d3b2a] px-5 py-28 text-white">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xs font-bold uppercase tracking-[.28em] text-white/60">
              Not sure what to give?
            </p>

            <h2 className="display-font mt-4 text-5xl md:text-7xl">
              Let meaning guide you.
            </h2>

            <p className="mx-auto mt-6 max-w-xl text-white/70">
              Tell us who you are gifting for and what you are celebrating.
              Our Gift Finder will narrow the collection for you.
            </p>

            <Link
              href="/gift-finder"
              className="mt-8 inline-block rounded-full bg-[#f6f0e7] px-7 py-4 text-sm font-bold text-[#5d3b2a] transition hover:-translate-y-1 hover:bg-white"
            >
              Start Gift Finder
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}