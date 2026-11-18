import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";

export async function GET() {
  const access = await requirePermission("inventory.read");
  if (access.response) return access.response;
  const { data, error } = await access.supabase
    .from("products")
    .select("id, name, category, image_url, stock, inventory_mode, product_variants(id, name, stock, inventory_mode, length, width, height, product_variant_images(id, image_url, alt_text, sort_order, available_quantity, low_stock_threshold))")
    .order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PATCH(request: Request) {
  const access = await requirePermission("inventory.update");
  if (access.response) return access.response;
  let body: { variantId?: string; imageId?: string; stock?: number; quickSet?: number; expectedStock?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const stock = Number(body.quickSet ?? body.stock);
  if (!Number.isInteger(stock) || stock < 0 || stock > 100000) {
    return NextResponse.json({ error: "Stock must be a non-negative integer." }, { status: 400 });
  }
  if (body.imageId && body.variantId) {
    const { data: image, error: imageError } = await access.supabase
      .from("product_variant_images")
      .select("id, variant_id")
      .eq("id", body.imageId)
      .eq("variant_id", body.variantId)
      .maybeSingle();
    if (imageError) return NextResponse.json({ error: imageError.message }, { status: 400 });
    if (!image) return NextResponse.json({ error: "Artwork does not belong to the selected variant." }, { status: 400 });
    const { data, error } = await access.supabase
      .from("product_variant_images")
      .update({ available_quantity: stock })
      .eq("id", body.imageId)
      .eq("variant_id", body.variantId)
      .eq("available_quantity", body.expectedStock === undefined ? stock : body.expectedStock)
      .select("id, available_quantity")
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ error: "Artwork changed elsewhere. Reload before saving this quantity." }, { status: 409 });
    return NextResponse.json(data);
  }
  if (body.quickSet !== undefined && body.variantId) {
    const { data, error } = await access.supabase
      .from("product_variant_images")
      .update({ available_quantity: stock })
      .eq("variant_id", body.variantId)
      .select("id, available_quantity");
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ updated: data?.length ?? 0 });
  }
  return NextResponse.json({ error: "A variant and artwork or quick-set target are required." }, { status: 400 });
}
