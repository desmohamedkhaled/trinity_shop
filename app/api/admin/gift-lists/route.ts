import { NextResponse } from "next/server";
import { requirePermission, serviceSupabase } from "@/lib/admin";

export async function GET() {
  const access = await requirePermission("gift_lists.read");
  if (access.response) return access.response;

  const supabase = serviceSupabase();
  if (!supabase) return NextResponse.json({ error: "Server database credentials are not configured." }, { status: 503 });

  const { data, error } = await supabase
    .from("gift_lists")
    .select("id,status,notes,created_at,customers(id,name,email,phone),gift_list_items(quantity,products(id,name,price,image_url))")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
