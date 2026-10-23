import { NextResponse } from "next/server";
import { serviceSupabase } from "@/lib/admin";
import { stripe } from "@/lib/stripe";

export async function GET(request: Request) {
  const supabase = serviceSupabase();
  if (!supabase || !stripe) {
    return NextResponse.json({ error: "Stripe checkout service is not configured." }, { status: 503 });
  }

  const url = new URL(request.url);
  const orderId = url.searchParams.get("order");
  const sessionId = url.searchParams.get("session_id");
  if (!orderId || !sessionId || !sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "A valid order and Stripe session are required." }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.metadata?.order_id !== orderId) {
    return NextResponse.json({ error: "Stripe session does not match this order." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, customer_name, customer_phone, customer_email, country, governorate, city, address, subtotal, discount, shipping, total, currency, payment_status, status, stock_reservation_status, order_items(product_name, quantity, unit_price, line_total)")
    .eq("id", orderId)
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();
  if (error) {
    console.error("Could not load Stripe checkout status", error);
    return NextResponse.json({ error: "Could not load checkout status." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Order was not found." }, { status: 404 });

  return NextResponse.json({
    order: data,
    stripe: { sessionStatus: session.status, paymentStatus: session.payment_status },
  }, { headers: { "Cache-Control": "no-store" } });
}
