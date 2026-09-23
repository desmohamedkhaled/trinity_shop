import { NextResponse } from "next/server";
import { requirePermission, serviceSupabase } from "@/lib/admin";

const statuses = new Set(["pending", "contacted", "confirmed", "preparing", "completed", "canceled"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("orders.update");
  if (access.response) return access.response;
  const supabase = serviceSupabase();
  if (!supabase) return NextResponse.json({ error: "Order service is not configured." }, { status: 503 });
  const body = await request.json();
  if (!statuses.has(body.status)) return NextResponse.json({ error: "Invalid order status." }, { status: 400 });
  const { id } = await params;
  const { data, error } = await supabase.from("orders").update({ status: body.status, admin_notes: typeof body.admin_notes === "string" ? body.admin_notes : undefined, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
