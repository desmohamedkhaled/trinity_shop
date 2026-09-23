import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.json([]);
  }

  const { searchParams } = new URL(request.url);
  const searchQuery = searchParams.get("q")?.trim();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  let query = supabase
    .from("products")
    .select("*")
    .eq("is_published", true);

  // Apply search filter if provided
  if (searchQuery) {
    query = query.or(
      `name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,meaning.ilike.%${searchQuery}%`
    );
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    (data ?? []).map((p: any) => ({
      ...p,
      image: p.image_url || p.image || "",
      featured: Boolean(p.is_featured),
      occasion: Array.isArray(p.occasion) ? p.occasion : [],
      giftFor: Array.isArray(p.gift_for) ? p.gift_for : [],
    }))
  );
}
