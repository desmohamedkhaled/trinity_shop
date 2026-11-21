import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { serviceSupabase } from "@/lib/admin";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  if (!stripe) return NextResponse.json({ error: "Stripe is not configured for checkout." }, { status: 503 });
  const supabase = serviceSupabase();
  if (!supabase) return NextResponse.json({ error: "Checkout service is not configured." }, { status: 503 });

  let body: { token?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return NextResponse.json({ error: "A valid balance payment token is required." }, { status: 422 });
  }
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const { data: order, error } = await supabase
    .from("orders")
    .select("id,order_number,customer_email,balance_payment_status,balance_payment_token_expires_at")
    .eq("balance_payment_token_hash", tokenHash)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!order) return NextResponse.json({ error: "The balance payment link is invalid." }, { status: 404 });
  if (order.balance_payment_status === "paid") {
    return NextResponse.json({ error: "The remaining balance has already been paid." }, { status: 409 });
  }
  if (!order.balance_payment_token_expires_at || Date.parse(order.balance_payment_token_expires_at) <= Date.now()) {
    return NextResponse.json({ error: "The balance payment link has expired." }, { status: 410 });
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("id,product_name,remaining_balance,quantity")
    .eq("order_id", order.id)
    .gt("remaining_balance", 0);
  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 400 });
  const remaining = (items ?? []).reduce((sum, item) =>
    sum + Number(item.remaining_balance), 0);
  if (!Number.isFinite(remaining) || remaining <= 0) {
    return NextResponse.json({ error: "There is no remaining balance for this order." }, { status: 409 });
  }

  const origin = (process.env.NEXT_PUBLIC_SITE_URL || request.headers.get("origin") || "http://localhost:3000").replace(/\/$/, "");
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "AUD",
          unit_amount: Math.round(remaining * 100),
          product_data: { name: `Remaining balance - ${order.order_number}` },
        },
        quantity: 1,
      }],
      success_url: `${origin}/checkout/balance/success?order=${encodeURIComponent(order.id)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/balance?token=${encodeURIComponent(token)}&canceled=1`,
      customer_email: order.customer_email || undefined,
      metadata: { balance_order_id: order.id, order_number: order.order_number },
      payment_intent_data: { metadata: { balance_order_id: order.id, order_number: order.order_number } },
    }, { idempotencyKey: `trinity-balance-order-${order.id}` });
    if (!session.url) throw new Error("Stripe checkout session URL was not returned.");
    return NextResponse.json({ ok: true, checkoutUrl: session.url });
  } catch (error) {
    console.error("Balance Stripe checkout session creation failed", error);
    return NextResponse.json({ error: "Unable to create the remaining-balance checkout session." }, { status: 502 });
  }
}
