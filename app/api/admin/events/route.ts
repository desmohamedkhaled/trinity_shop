import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/admin";

export async function GET() {
  const access = await requirePermission("events.read");
  if (access.response) return access.response;
  const { supabase } = access;

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const access = await requirePermission("events.create");
  if (access.response) return access.response;
  const { supabase } = access;

  const body = await request.json();
  if (!body.title || !String(body.title).trim()) return NextResponse.json({ error: "Event name is required." }, { status: 400 });
  if (!body.image_url || !String(body.image_url).trim()) return NextResponse.json({ error: "Event image is required." }, { status: 400 });
  if (!body.event_date || !String(body.event_date).trim()) return NextResponse.json({ error: "Event date is required." }, { status: 400 });
  if (!body.start_time || !String(body.start_time).trim()) return NextResponse.json({ error: "Start time is required." }, { status: 400 });
  if (!body.description || !String(body.description).trim()) return NextResponse.json({ error: "Description is required." }, { status: 400 });

  if (body.button_url && !/^https?:\/\//i.test(String(body.button_url))) return NextResponse.json({ error: "Button URL must be a valid URL." }, { status: 400 });

  const start = body.start_time;
  const end = body.end_time;
  if (end && start && end < start) return NextResponse.json({ error: "End time cannot be earlier than start time." }, { status: 400 });

  const slugBase = String(body.title).trim().toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
  let slug = slugBase || "event";
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabase.from("events").select("id, slug").eq("slug", slug).maybeSingle();
  if (existing) {
    let counter = 2;
    let candidate = `${slug}-${counter}`;
    while (true) {
      const { data: match } = await supabase.from("events").select("id").eq("slug", candidate).maybeSingle();
      if (!match) {
        slug = candidate;
        break;
      }
      counter += 1;
      candidate = `${slug}-${counter}`;
    }
  }

  const row = {
    title: String(body.title).trim(),
    slug,
    image_url: String(body.image_url),
    description: String(body.description).trim(),
    event_date: String(body.event_date),
    start_time: String(body.start_time),
    end_time: body.end_time ? String(body.end_time) : null,
    location: body.location ? String(body.location).trim() : null,
    button_text: body.button_text ? String(body.button_text).trim() : null,
    button_url: body.button_url ? String(body.button_url).trim() : null,
    status: String(body.status || "draft"),
    is_featured: Boolean(body.is_featured),
    display_order: Number(body.display_order || 0),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("events").insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  revalidatePath("/events");
  revalidatePath("/");
  return NextResponse.json(data);
}
