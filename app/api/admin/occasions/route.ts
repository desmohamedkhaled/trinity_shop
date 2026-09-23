import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";

export async function GET() {
  const access = await requirePermission("occasions.read");
  if (access.response) return access.response;
  const { supabase } = access;
  const { data, error } = await supabase.from("occasions").select("*").order("sort_order", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const access = await requirePermission("occasions.create");
  if (access.response) return access.response;
  const { supabase } = access;
  const body = await request.json();
  if (typeof body.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug) || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "A valid slug and name are required." }, { status: 400 });
  }
  const { data, error } = await supabase.from("occasions").insert({ slug: body.slug, name: body.name.trim(), subtitle: body.subtitle || null, image_url: body.image_url || null, sort_order: Number(body.sort_order) || 0, is_published: body.is_published !== false }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
