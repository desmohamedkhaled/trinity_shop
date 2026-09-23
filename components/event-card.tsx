import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calendar, Clock, MapPin } from "lucide-react";
import type { SiteEvent } from "@/lib/events";

function formatDisplayDate(value: string) {
  if (!value) return "";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

export function EventCard({ event }: { event: SiteEvent }) {
  const destination = event.button_url || `/events/${event.slug}`;
  const cardLabel = event.button_text || "Learn More";

  return (
    <article className="group overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative h-72 w-full overflow-hidden">
        <Image src={event.image_url} alt={event.title} fill className="object-cover transition duration-700 group-hover:scale-105" sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw" />
      </div>
      <div className="p-7">
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.2em] text-[#b48d55]">
          <Calendar size={14} />
          <span>{formatDisplayDate(event.event_date)}</span>
        </div>
        <h3 className="mt-4 text-2xl font-black leading-tight text-[#083b68]">{event.title}</h3>
        <div className="mt-4 flex items-center gap-2 text-sm font-bold text-black/60">
          <Clock size={15} />
          <span>{event.start_time}{event.end_time ? ` – ${event.end_time}` : ""}</span>
        </div>
        {event.location && (
          <div className="mt-2 flex items-center gap-2 text-sm font-bold text-black/60">
            <MapPin size={15} />
            <span>{event.location}</span>
          </div>
        )}
        <p className="mt-5 line-clamp-3 min-h-[72px] text-sm leading-7 text-black/60">{event.description}</p>
        <div className="mt-6">
          <Link href={destination} className="inline-flex items-center gap-2 rounded-full border border-[#083b68] px-5 py-3 text-xs font-black uppercase tracking-[.16em] text-[#083b68] transition hover:bg-[#083b68] hover:text-white">
            {cardLabel}
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}
