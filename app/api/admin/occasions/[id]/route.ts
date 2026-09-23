import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("occasions.update");
  if (access.response) return access.response;
  const { supabase } = access;
  const body = await request.json();
  const { id } = await params;
  const row: Record<string, unknown> = {};
  for (const key of ["slug", "name", "subtitle", "image_url", "sort_order", "is_published"]) if (body[key] !== undefined) row[key] = body[key];
  if (row.slug !== undefined && (typeof row.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug))) return NextResponse.json({ error: "Invalid slug." }, { status: 400 });
  if (row.name !== undefined && (typeof row.name !== "string" || !row.name.trim())) return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
  const { data, error } = await supabase.from("occasions").update(row).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("occasions.delete");
  if (access.response) return access.response;
  const { supabase } = access;
  const { id } = await params;
  const { error } = await supabase.from("occasions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
