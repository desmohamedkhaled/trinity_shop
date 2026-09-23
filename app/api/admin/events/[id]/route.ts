import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/admin";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("events.read");
  if (access.response) return access.response;
  const { supabase } = access;

  const { id } = await params;
  const { data, error } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? null);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("events.update");
  if (access.response) return access.response;
  const { supabase } = access;

  const body = await request.json();
  const { id } = await params;

  if (body.title !== undefined && !String(body.title).trim()) return NextResponse.json({ error: "Event name is required." }, { status: 400 });
  if (body.image_url !== undefined && !String(body.image_url).trim()) return NextResponse.json({ error: "Event image is required." }, { status: 400 });
  if (body.event_date !== undefined && !String(body.event_date).trim()) return NextResponse.json({ error: "Event date is required." }, { status: 400 });
  if (body.start_time !== undefined && !String(body.start_time).trim()) return NextResponse.json({ error: "Start time is required." }, { status: 400 });
  if (body.description !== undefined && !String(body.description).trim()) return NextResponse.json({ error: "Description is required." }, { status: 400 });
  if (body.button_url !== undefined && body.button_url && !/^https?:\/\//i.test(String(body.button_url))) return NextResponse.json({ error: "Button URL must be a valid URL." }, { status: 400 });

  if (body.start_time && body.end_time && body.end_time < body.start_time) return NextResponse.json({ error: "End time cannot be earlier than start time." }, { status: 400 });

  const row: Record<string, unknown> = {};
  for (const key of ["title", "slug", "image_url", "description", "event_date", "start_time", "end_time", "location", "button_text", "button_url", "status", "is_featured", "display_order"])
    if (body[key] !== undefined) row[key] = body[key];

  if (row.title && typeof row.title === "string") row.title = String(row.title).trim();
  if (row.description && typeof row.description === "string") row.description = String(row.description).trim();
  if (row.location && typeof row.location === "string") row.location = String(row.location).trim();
  if (row.button_text && typeof row.button_text === "string") row.button_text = String(row.button_text).trim();
  if (row.button_url && typeof row.button_url === "string") row.button_url = String(row.button_url).trim();

  row.updated_at = new Date().toISOString();

  const { data, error } = await supabase.from("events").update(row).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  revalidatePath("/events");
  revalidatePath("/");
  revalidatePath(`/events/${data.slug}`);
  return NextResponse.json(data);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("events.delete");
  if (access.response) return access.response;
  const { supabase } = access;

  const { id } = await params;
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  revalidatePath("/events");
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
