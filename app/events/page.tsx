import Link from "next/link";
import Image from "next/image";
import { Calendar, Clock, MapPin, ArrowRight } from "lucide-react";
import { getPublishedEvents } from "@/lib/events";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default async function EventsPage() {
  const events = await getPublishedEvents();

  return (
    <>
      <SiteHeader />
      <div className="min-h-screen bg-[#fdfaf6]">
        <section className="trinity-container py-16 md:py-20">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[.28em] text-[#b48d55]">Trinity events</p>
            <h1 className="mt-4 text-5xl font-black tracking-tight text-[#083b68] md:text-6xl">Events</h1>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="rounded-3xl border border-black/10 bg-white p-10 text-center">
            <p className="text-lg font-bold text-[#083b68]">No events are published yet.</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => (
              <article key={event.id} className="overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-sm">
                <div className="relative h-72 w-full overflow-hidden">
                  <Image src={event.image_url} alt={event.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
                </div>
                <div className="p-7">
                  <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-[#b48d55]">
                    <Calendar size={14} />
                    {event.event_date}
                  </div>
                  <h2 className="text-2xl font-black text-[#083b68]">{event.title}</h2>
                  <div className="mt-4 flex items-center gap-3 text-sm font-bold text-black/60">
                    <Clock size={16} />
                    <span>{event.start_time}{event.end_time ? ` – ${event.end_time}` : ""}</span>
                  </div>
                  {event.location && (
                    <div className="mt-2 flex items-center gap-3 text-sm font-bold text-black/60">
                      <MapPin size={16} />
                      <span>{event.location}</span>
                    </div>
                  )}
                  <p className="mt-5 line-clamp-3 text-sm leading-7 text-black/60">{event.description}</p>
                  <div className="mt-6">
                    <Link href={`/events/${event.slug}`} className="inline-flex items-center gap-2 rounded-full border border-[#083b68] px-6 py-3 text-xs font-black uppercase tracking-[.18em] text-[#083b68] hover:bg-[#083b68] hover:text-white">
                      Learn more <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        </section>
      </div>
      <SiteFooter />
    </>
  );
}
