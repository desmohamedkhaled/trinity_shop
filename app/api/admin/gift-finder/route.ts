import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";

export async function GET() {
  const access = await requirePermission("gift_finder.read");
  if (access.response) return access.response;
  const { supabase } = access;

  const { data, error } = await supabase
    .from("gift_questions")
    .select("id,question,sort_order,is_active,gift_options(id,label,value)")
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PATCH(request: Request) {
  const access = await requirePermission("gift_finder.update");
  if (access.response) return access.response;
  const { supabase } = access;

  const body = await request.json();
  if (!body.id || typeof body.question !== "string" || !body.question.trim()) {
    return NextResponse.json({ error: "A question id and text are required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("gift_questions")
    .update({ question: body.question.trim() })
    .eq("id", body.id)
    .select("id,question,sort_order,is_active,gift_options(id,label,value)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
