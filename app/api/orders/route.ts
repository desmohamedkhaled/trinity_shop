import { NextResponse } from "next/server";
import { serviceSupabase } from "@/lib/admin";

export async function POST(request: Request) {
  const supabase = serviceSupabase();
  if (!supabase) return NextResponse.json({ error: "Order service is not configured." }, { status: 503 });

  let body: { customer?: Record<string, unknown>; items?: { id?: string; quantity?: number }[] };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const customer = body.customer || {};
  const items = Array.isArray(body.items) ? body.items : [];
  if (!customer.name || !customer.phone || !customer.country || !customer.governorate || !customer.city || !customer.address || !items.length) {
    return NextResponse.json({ error: "Required checkout details and cart items are missing." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("create_checkout_order", { customer, items });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
