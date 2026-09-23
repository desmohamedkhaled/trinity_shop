import { NextResponse } from "next/server";
import { requirePermission, serviceSupabase } from "@/lib/admin";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; recommendationId: string }> }
) {
  const { id, recommendationId } = await params;
  const access = await requirePermission("gift_finder.update");
  if (access.response) return access.response;

  const supabase = serviceSupabase();
  if (!supabase)
    return NextResponse.json(
      { error: "Service is not configured" },
      { status: 503 }
    );

  const { error } = await supabase
    .from("request_items")
    .delete()
    .eq("id", recommendationId)
    .eq("request_id", id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
