import { NextResponse } from "next/server";
import { requirePermission, serviceSupabase } from "@/lib/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await requirePermission("gift_finder.update");
  if (access.response) return access.response;

  const body = await request.json();
  const { product_id } = body;

  if (!product_id)
    return NextResponse.json(
      { error: "Product ID is required" },
      { status: 400 }
    );

  const supabase = serviceSupabase();
  if (!supabase)
    return NextResponse.json(
      { error: "Service is not configured" },
      { status: 503 }
    );

  // Verify product exists
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id,price")
    .eq("id", product_id)
    .single();

  if (productError || !product)
    return NextResponse.json(
      { error: "Product not found" },
      { status: 404 }
    );

  // Add recommendation
  const { data, error } = await supabase
    .from("request_items")
    .insert({
      request_id: id,
      product_id,
      quantity: 1,
      unit_price: product.price,
    })
    .select();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(data?.[0] || {}, { status: 201 });
}
