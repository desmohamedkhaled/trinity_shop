import { NextResponse } from "next/server";
import { requirePermission, serviceSupabase } from "@/lib/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await requirePermission("gift_finder.read");
  if (access.response) return access.response;

  const supabase = serviceSupabase();
  if (!supabase)
    return NextResponse.json(
      { error: "Service is not configured" },
      { status: 503 }
    );

  // Get request details
  const { data: requestData, error: reqError } = await supabase
    .from("requests")
    .select(
      "id,status,request_type,gift_for,occasion,budget_min,budget_max,gift_category,preferences,notes,admin_notes,created_at,customers(id,name,email,phone)"
    )
    .eq("id", id)
    .single();

  if (reqError || !requestData)
    return NextResponse.json(
      { error: "Request not found" },
      { status: 404 }
    );

  // Get recommendations
  const { data: recommendations, error: recError } = await supabase
    .from("request_items")
    .select("id,product_id,products(id,slug,name,price,image_url,stock)")
    .eq("request_id", id);

  if (recError)
    console.error("Error loading recommendations:", recError.message);

  return NextResponse.json({
    request: requestData,
    recommendations: (recommendations || []).map((rec: any) => ({
      id: rec.id,
      product_id: rec.product_id,
      product: {
        id: rec.products.id,
        slug: rec.products.slug,
        name: rec.products.name,
        price: rec.products.price,
        image: rec.products.image_url,
        stock: rec.products.stock,
      },
    })),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await requirePermission("gift_finder.update");
  if (access.response) return access.response;

  const body = await request.json();
  const supabase = serviceSupabase();
  if (!supabase)
    return NextResponse.json(
      { error: "Service is not configured" },
      { status: 503 }
    );

  const { status, admin_notes } = body;

  const { data, error } = await supabase
    .from("requests")
    .update({
      status: status || undefined,
      admin_notes: admin_notes !== undefined ? admin_notes : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(
      "id,status,request_type,gift_for,occasion,budget_min,budget_max,gift_category,preferences,notes,admin_notes,created_at,customers(id,name,email,phone)"
    )
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(data);
}
