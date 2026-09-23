import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";

export async function GET(request: Request) {
  const access = await requirePermission("dashboard.read");
  if (access.response) return access.response;

  const { supabase } = access;
  if (!supabase) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const range = new URL(request.url).searchParams.get("range") || "all";
  const start = new Date();
  if (range === "today") start.setHours(0, 0, 0, 0);
  if (range === "7d") start.setDate(start.getDate() - 7);
  if (range === "30d") start.setDate(start.getDate() - 30);
  if (range === "year") { start.setMonth(0, 1); start.setHours(0, 0, 0, 0); }
  const applyRange = (query: any) => range === "all" ? query : query.gte("created_at", start.toISOString());
  const [products, requests, customers, giftLists] = await Promise.all([
    applyRange(supabase.from("products").select("id", { count: "exact", head: true })),
    applyRange(supabase.from("requests").select("id", { count: "exact", head: true })),
    applyRange(supabase.from("customers").select("id", { count: "exact", head: true })),
    applyRange(supabase.from("gift_lists").select("id", { count: "exact", head: true })),
  ]);

  const failed = [products, requests, customers, giftLists].find((result) => result.error);
  if (failed?.error) {
    return NextResponse.json({ error: failed.error.message }, { status: 500 });
  }

  return NextResponse.json({
    products: products.count ?? 0,
    requests: requests.count ?? 0,
    customers: customers.count ?? 0,
    giftLists: giftLists.count ?? 0,
  });
}
