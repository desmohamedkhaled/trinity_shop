import Image from "next/image";
import Link from "next/link";
import { Calendar, Clock, MapPin, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { getEventBySlug } from "@/lib/events";

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return notFound();

  return (
    <div className="min-h-screen bg-[#fdfaf6]">
      <section className="trinity-container py-16 md:py-20">
        <div className="grid gap-10 md:grid-cols-[0.95fr_1.05fr]">
          <div className="relative min-h-[420px] overflow-hidden rounded-[2.5rem] shadow-xl">
            <Image src={event.image_url} alt={event.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
          </div>
          <article className="flex flex-col justify-center">
            <p className="text-xs font-black uppercase tracking-[.28em] text-[#b48d55]">Trinity Event</p>
            <h1 className="mt-4 text-5xl font-black leading-none text-[#083b68] md:text-6xl">{event.title}</h1>

            <div className="mt-8 space-y-4 text-sm font-bold text-black/70">
              <div className="flex items-center gap-3"><Calendar size={16} /><span>{event.event_date}</span></div>
              <div className="flex items-center gap-3"><Clock size={16} /><span>{event.start_time}{event.end_time ? ` – ${event.end_time}` : ""}</span></div>
              {event.location && <div className="flex items-center gap-3"><MapPin size={16} /><span>{event.location}</span></div>}
            </div>

            <div className="mt-8 rounded-3xl border border-black/10 bg-white p-7">
              <p className="leading-8 text-black/60">{event.description}</p>
            </div>

            {event.button_url && (
              <div className="mt-8">
                <Link href={event.button_url} className="inline-flex items-center gap-2 rounded-full bg-[#083b68] px-7 py-4 text-xs font-black uppercase tracking-[.2em] text-white hover:bg-[#0b4166]">
                  {event.button_text || "Learn More"}
                  <ExternalLink size={16} />
                </Link>
              </div>
            )}
          </article>
        </div>
      </section>
    </div>
  );
}
