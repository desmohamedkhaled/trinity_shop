import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json([]);

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("gift_questions")
    .select("id,question,sort_order,is_active,gift_options(id,label,value)")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const normalized = (data ?? []).map((question) => ({
    ...question,
    gift_options: question.gift_options?.map((option) => ({
      ...option,
      label: option.label.replace(/\bEGP\b/g, "AUD"),
    })),
  }));
  return NextResponse.json(normalized);
}
