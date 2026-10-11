import { NextResponse } from "next/server";
import { serviceSupabase } from "@/lib/admin";
import { stripe } from "@/lib/stripe";

type Customer = {
  name?: string;
  phone?: string;
  email?: string;
  country?: string;
  governorate?: string;
  city?: string;
  address?: string;
};

type Item = { id?: string; quantity?: number };

function normalizeItems(items: Item[]) {
  const merged = new Map<string, number>();
  for (const item of items) {
    const id = typeof item.id === "string" ? item.id.trim() : "";
    const quantity = Number(item.quantity);
    if (!id || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) return null;
    merged.set(id, (merged.get(id) || 0) + quantity);
  }
  return Array.from(merged, ([id, quantity]) => ({ id, quantity })).sort((left, right) => left.id.localeCompare(right.id));
}

export async function POST(request: Request) {
  const supabase = serviceSupabase();
  if (!supabase) return NextResponse.json({ error: "Checkout service is not configured." }, { status: 503 });
  if (!stripe) return NextResponse.json({ error: "Stripe is not configured for checkout." }, { status: 503 });

  let body: { customer?: Customer; items?: Item[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const customer = body.customer || {};
  const requiredCustomer = ["name", "phone", "country", "governorate", "city", "address"] as const;
  if (requiredCustomer.some((key) => !customer[key]?.trim()) || !Array.isArray(body.items) || !body.items.length) {
    return NextResponse.json({ error: "Required checkout details and cart items are missing." }, { status: 400 });
  }

  const items = normalizeItems(body.items);
  if (!items) return NextResponse.json({ error: "Each cart item must have a valid quantity." }, { status: 400 });

  const customerPayload = {
    name: customer.name!.trim(),
    phone: customer.phone!.trim(),
    email: customer.email?.trim() || "",
    country: customer.country!.trim(),
    governorate: customer.governorate!.trim(),
    city: customer.city!.trim(),
    address: customer.address!.trim(),
  };

  let reservation: { order: Record<string, unknown>; items: Record<string, unknown>[] };
  try {
    const { data, error } = await supabase.rpc("create_stripe_pending_order", {
      customer: customerPayload,
      items,
    });
    if (error || !data?.order) throw new Error(error?.message || "Unable to reserve the order stock.");
    reservation = data as typeof reservation;
  } catch (error) {
    console.error("Atomic Stripe stock reservation failed", error);
    return NextResponse.json({ error: "Some products are no longer available. Please refresh your cart." }, { status: 409 });
  }

  const order = reservation.order;
  const orderId = String(order.id);
  const orderNumber = String(order.order_number);
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || request.headers.get("origin") || "http://localhost:3000").replace(/\/$/, "");
  const lineItems = reservation.items.map((item) => ({
    price_data: {
      currency: String(order.currency || "USD").toLowerCase(),
      unit_amount: Math.round(Number(item.unit_price) * 100),
      product_data: {
        name: String(item.product_name),
        images: item.product_image ? [String(item.product_image)] : undefined,
      },
    },
    quantity: Number(item.quantity),
  }));

  let createdSessionId: string | null = null;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: `${origin}/checkout/success?order=${encodeURIComponent(orderId)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout?canceled=1`,
      customer_email: customerPayload.email || undefined,
      billing_address_collection: "required",
      metadata: { order_id: orderId, order_number: orderNumber },
      payment_intent_data: { metadata: { order_id: orderId, order_number: orderNumber } },
    }, { idempotencyKey: `trinity-stripe-order-${orderId}` });
    createdSessionId = session.id;

    if (!session.url) throw new Error("Stripe checkout session URL was not returned.");

    const paymentIntentId = typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || null;
    const { data: attachedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("stock_reservation_status", "reserved")
      .select("id")
      .maybeSingle();

    if (updateError || !attachedOrder) throw new Error("Unable to attach Stripe session to the order.");

    return NextResponse.json({ ok: true, checkoutUrl: session.url, order: reservation.order });
  } catch (error) {
    console.error("Stripe checkout session creation failed", error);
    if (createdSessionId) {
      try {
        await stripe.checkout.sessions.expire(createdSessionId);
      } catch (expireError) {
        console.error("Failed to expire orphaned Stripe checkout session", expireError);
      }
    }
    try {
      const { error: releaseError } = await supabase.rpc("release_stripe_stock", { p_order_id: orderId });
      if (releaseError) console.error("Failed to release Stripe reservation after session failure", releaseError);
    } catch (releaseError) {
      console.error("Unexpected Stripe reservation cleanup failure", releaseError);
    }

    return NextResponse.json({ error: "Unable to create the Stripe checkout session." }, { status: 502 });
  }
}
