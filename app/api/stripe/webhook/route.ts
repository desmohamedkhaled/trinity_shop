import { NextResponse } from "next/server";
import { serviceSupabase } from "@/lib/admin";
import { stripe } from "@/lib/stripe";

async function findOrderByStripeContext(
  supabase: NonNullable<ReturnType<typeof serviceSupabase>>,
  { orderId, sessionId, paymentIntentId }: { orderId?: string | null; sessionId?: string | null; paymentIntentId?: string | null },
) {
  if (orderId) {
    const { data, error } = await supabase
      .from("orders")
      .select("id, payment_status, status, stock_reservation_status, stripe_checkout_session_id, stripe_payment_intent_id")
      .eq("id", orderId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Order lookup by id failed in webhook", error);
    }

    if (data) return data;
  }

  if (sessionId) {
    const { data, error } = await supabase
      .from("orders")
      .select("id, payment_status, status, stock_reservation_status, stripe_checkout_session_id, stripe_payment_intent_id")
      .eq("stripe_checkout_session_id", sessionId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Order lookup by session failed in webhook", error);
    }

    if (data) return data;
  }

  if (paymentIntentId) {
    const { data, error } = await supabase
      .from("orders")
      .select("id, payment_status, status, stock_reservation_status, stripe_checkout_session_id, stripe_payment_intent_id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Order lookup by payment intent failed in webhook", error);
    }

    if (data) return data;
  }

  return null;
}

export async function POST(request: Request) {
  const supabase = serviceSupabase();
  if (!supabase) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  if (!stripe) {
    console.error("Stripe webhook received, but stripe client is not configured.");
    return NextResponse.json({ received: false }, { status: 503 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Stripe webhook secret is missing.");
    return NextResponse.json({ received: false }, { status: 500 });
  }

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing Stripe signature.", { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error("Stripe webhook verification failed", error);
    return new Response("Webhook signature verification failed.", { status: 400 });
  }

  const { type, data } = event;
  const object = data.object as {
    id?: string;
    metadata?: Record<string, string | undefined>;
    payment_intent?: string | { id?: string } | null;
    payment_status?: string;
  };

  if (type === "checkout.session.completed") {
    const orderId = object.metadata?.order_id ?? null;
    const sessionId = object.id ?? null;
    const paymentIntentId = typeof object.payment_intent === "string" ? object.payment_intent : object.payment_intent?.id ?? null;
    const order = await findOrderByStripeContext(supabase, { orderId, sessionId, paymentIntentId });

    if (!order) {
      console.warn("Stripe checkout.session.completed was received without an associated Trinity order.", { sessionId, paymentIntentId, orderId });
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const { error: completeError } = await supabase.rpc("complete_stripe_payment", {
      p_order_id: order.id,
      checkout_session_id: sessionId,
      payment_intent_id: paymentIntentId,
    });

    if (completeError) {
      console.error("Could not complete Stripe payment", completeError);
      return NextResponse.json({ received: false }, { status: 500 });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  }

  if (type === "checkout.session.expired") {
    const orderId = object.metadata?.order_id ?? null;
    const sessionId = object.id ?? null;
    const paymentIntentId = typeof object.payment_intent === "string" ? object.payment_intent : object.payment_intent?.id ?? null;
    const order = await findOrderByStripeContext(supabase, { orderId, sessionId, paymentIntentId });

    if (!order) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const { error: releaseError } = await supabase.rpc("release_stripe_stock", {
      p_order_id: order.id,
    });

    if (releaseError) {
      console.error("Could not release expired Stripe reservation", releaseError);
      return NextResponse.json({ received: false }, { status: 500 });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  }

  if (type === "payment_intent.payment_failed") {
    const paymentIntentId = data.object?.id ?? null;
    const paymentIntentMetadata = (data.object as { metadata?: Record<string, string | undefined> }).metadata;
    const order = await findOrderByStripeContext(supabase, {
      orderId: paymentIntentMetadata?.order_id,
      paymentIntentId,
    });

    if (!order) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const { error: releaseError } = await supabase.rpc("release_stripe_stock", {
      p_order_id: order.id,
    });

    if (releaseError) {
      console.error("Could not release failed Stripe reservation", releaseError);
      return NextResponse.json({ received: false }, { status: 500 });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
