import { NextResponse } from "next/server";
import { requirePermission, serviceSupabase } from "@/lib/admin";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("customers.delete");
  if (access.response) return access.response;
  const supabase = serviceSupabase();
  if (!supabase) return NextResponse.json({ error: "Server database credentials are not configured." }, { status: 503 });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Customer id is required." }, { status: 400 });

  const { data: customer, error: lookupError } = await supabase.from("customers").select("id").eq("id", id).maybeSingle();
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });
  if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Could not delete customer safely. Related records were preserved." }, { status: 409 });
  return NextResponse.json({ ok: true, id });
}