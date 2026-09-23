import { NextResponse } from "next/server";
import { requirePermission, serviceSupabase } from "@/lib/admin";

export async function GET() {
  const access = await requirePermission("orders.read");
  if (access.response) return access.response;
  const supabase = serviceSupabase();
  if (!supabase) return NextResponse.json({ error: "Order service is not configured." }, { status: 503 });
  const { data, error } = await supabase.from("orders").select("*,order_items(*)").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
