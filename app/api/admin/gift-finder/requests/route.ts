import { NextResponse } from "next/server";
import { requirePermission, serviceSupabase } from "@/lib/admin";

export async function GET() {
  const access = await requirePermission("gift_finder.read");
  if (access.response) return access.response;
  const supabase = serviceSupabase();
  if (!supabase) return NextResponse.json({ error: "Request service is not configured." }, { status: 503 });
  const { data, error } = await supabase.from("requests").select("id,status,request_type,gift_for,occasion,budget_min,budget_max,gift_category,preferences,notes,admin_notes,created_at,customers(name,email,phone)").eq("request_type", "gift_finder").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
