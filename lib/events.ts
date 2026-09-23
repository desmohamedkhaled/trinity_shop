import { createClient } from "@supabase/supabase-js";

export type EventStatus = "draft" | "published" | "archived";

export type SiteEvent = {
  id: string;
  title: string;
  slug: string;
  image_url: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  button_text: string | null;
  button_url: string | null;
  status: EventStatus;
  is_featured: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

function supabasePublic() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function getPublishedEvents(): Promise<SiteEvent[]> {
  const supabase = supabasePublic();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Failed to load events:", error);
    return [];
  }

  return (data ?? []) as SiteEvent[];
}

export async function getEventBySlug(slug: string): Promise<SiteEvent | null> {
  const supabase = supabasePublic();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("Failed to load event:", error);
    return null;
  }

  return (data ?? null) as SiteEvent | null;
}

export async function getHomepageUpcomingEvents(limit = 3): Promise<SiteEvent[]> {
  const supabase = supabasePublic();
  if (!supabase) return [];

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("events")
    .select("id,title,slug,image_url,description,event_date,start_time,end_time,location,button_text,button_url,status,is_featured,display_order")
    .eq("status", "published")
    .gte("event_date", todayIso)
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true })
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Failed to load homepage events:", error);
    return [];
  }

  const events = (data ?? []) as SiteEvent[];
  const featured = events.filter((event) => event.is_featured);
  const nonFeatured = events.filter((event) => !event.is_featured);

  const ordered = [...featured, ...nonFeatured]
    .slice(0, limit + 1)
    .sort((a, b) => {
      if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
      const dateOrder = a.event_date.localeCompare(b.event_date);
      if (dateOrder !== 0) return dateOrder;
      const timeOrder = (a.start_time || "").localeCompare(b.start_time || "");
      if (timeOrder !== 0) return timeOrder;
      return (a.display_order ?? 0) - (b.display_order ?? 0);
    });

  return ordered.slice(0, limit);
}

export async function getUpcomingEvents(): Promise<SiteEvent[]> {
  const events = await getPublishedEvents();
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  return events
    .filter((event) => event.event_date >= todayIso)
    .sort((a, b) => a.event_date.localeCompare(b.event_date) || (a.start_time || "").localeCompare(b.start_time || ""));
}
