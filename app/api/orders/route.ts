import { NextResponse } from "next/server";
import { serviceSupabase } from "@/lib/admin";
import { validateCheckoutItems } from "@/lib/checkout-validation";
import { calculateParcel, quoteEflowService } from "@/lib/eflow";

export async function POST(request: Request) {
  const supabase = serviceSupabase();
  if (!supabase) return NextResponse.json({ error: "Order service is not configured." }, { status: 503 });

  let body: { customer?: Record<string, unknown>; shipping_service?: unknown; items?: { id?: string; variant_id?: string; image_id?: string; quantity?: number; is_deposit?: boolean }[] };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const customer = body.customer || {};
  const items = Array.isArray(body.items) ? body.items : [];
  if (!customer.name || !customer.phone || !customer.country || !customer.governorate || !customer.city || !customer.postcode || !customer.address || !items.length) {
    return NextResponse.json({ error: "Required checkout details and cart items are missing." }, { status: 400 });
  }
  if (!/^\d{4}$/.test(String(customer.postcode))) return NextResponse.json({ error: "A valid 4-digit Australian postcode is required." }, { status: 422 });
  if (typeof body.shipping_service !== "string" || !body.shipping_service.trim()) {
    return NextResponse.json({ error: "Select an available live shipping service." }, { status: 422 });
  }
  const validationError = await validateCheckoutItems(supabase, items);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 409 });

  const parcelResult = await calculateParcel(supabase, items.map((item) => ({ id: String(item.id), variant_id: item.variant_id, quantity: Number(item.quantity) })));
  if ("error" in parcelResult) return NextResponse.json({ error: parcelResult.error }, { status: 422 });
  parcelResult.parcel.to_postcode = String(customer.postcode);
  const quote = await quoteEflowService(parcelResult.parcel, body.shipping_service);
  if (quote.error) return NextResponse.json({ error: quote.error }, { status: quote.status });
  const quoteBody = quote.payload as { quote?: { service?: string; total?: number; currency?: string } };
  if (!quoteBody.quote || !Number.isFinite(quoteBody.quote.total) || quoteBody.quote.total! < 0) {
    return NextResponse.json({ error: "eFlow returned an invalid shipping quote." }, { status: 502 });
  }
  const shipping = Number(quoteBody.quote.total);

  const { data, error } = await supabase.rpc("create_checkout_order", { customer, items });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const order = data?.order as { id?: string; subtotal?: number } | undefined;
  if (!order?.id) return NextResponse.json({ error: "Order creation failed." }, { status: 500 });
  const subtotal = Number(order.subtotal || 0);
  const orderItems = Array.isArray(data.items) ? data.items as { id?: string; unit_price?: number; quantity?: number }[] : [];
  const depositItems = orderItems.map((orderItem, index) => {
    const item = items[index];
    const unitPrice = Number(orderItem.unit_price);
    const isDeposit = item?.is_deposit === true;
    return {
      id: orderItem.id,
      is_deposit: isDeposit,
      deposit_percentage: isDeposit ? 50 : 0,
      remaining_balance: isDeposit ? Math.round((unitPrice * 0.5) * Number(orderItem.quantity || item?.quantity || 0) * 100) / 100 : 0,
    };
  }).filter((item): item is { id: string; is_deposit: boolean; deposit_percentage: number; remaining_balance: number } => typeof item.id === "string");
  if (depositItems.length) {
    const { error: preorderError } = await Promise.all(depositItems.map((item) => supabase.from("order_items").update(item).eq("id", item.id))).then((results) => ({
      error: results.find((result) => result.error)?.error || null,
    }));
    if (preorderError) return NextResponse.json({ error: "Unable to persist the selected preorder payment option." }, { status: 500 });
  }
  const hasDeposit = depositItems.some((item) => item.is_deposit);
  if (hasDeposit) {
    const { error: preorderError } = await supabase.from("orders").update({
      preorder_status: "deposit_pending",
      balance_payment_status: "pending",
      updated_at: new Date().toISOString(),
    }).eq("id", order.id);
    if (preorderError) return NextResponse.json({ error: "Unable to persist the preorder status." }, { status: 500 });
  }
  const { error: shippingUpdateError } = await supabase
    .from("orders")
    .update({ shipping, total: subtotal + shipping, currency: "AUD", updated_at: new Date().toISOString() })
    .eq("id", order.id);
  if (shippingUpdateError) return NextResponse.json({ error: "Unable to apply the verified live shipping amount." }, { status: 500 });
  data.order.shipping = shipping;
  data.order.total = subtotal + shipping;
  data.order.currency = "AUD";
  return NextResponse.json(data, { status: 201 });
}
