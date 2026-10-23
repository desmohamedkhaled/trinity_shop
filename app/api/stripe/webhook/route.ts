import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { serviceSupabase } from "@/lib/admin";
import { stripe } from "@/lib/stripe";

async function findOrderByStripeContext(
  supabase: NonNullable<ReturnType<typeof serviceSupabase>>,
  { orderId, sessionId, paymentIntentId }: { orderId?: string | null; sessionId?: string | null; paymentIntentId?: string | null },
) {
  const matchesStoredStripeIds = (order: { stripe_checkout_session_id?: string | null; stripe_payment_intent_id?: string | null }) =>
    (!sessionId || !order.stripe_checkout_session_id || order.stripe_checkout_session_id === sessionId) &&
    (!paymentIntentId || !order.stripe_payment_intent_id || order.stripe_payment_intent_id === paymentIntentId);

  if (orderId) {
    const { data, error } = await supabase
      .from("orders")
      .select("id, payment_status, status, stock_reservation_status, stripe_checkout_session_id, stripe_payment_intent_id")
      .eq("id", orderId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Order lookup by id failed in webhook", error);
    }

    if (data) return matchesStoredStripeIds(data) ? data : null;
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

    if (data) return matchesStoredStripeIds(data) ? data : null;
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

    if (data) return matchesStoredStripeIds(data) ? data : null;
  }

  return null;
}

async function claimEvent(supabase: NonNullable<ReturnType<typeof serviceSupabase>>, event: Stripe.Event) {
  const { error } = await supabase.from("stripe_webhook_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
    status: "processing",
    claimed_at: new Date().toISOString(),
  });

  if (!error) return "claimed" as const;
  if (error.code !== "23505") throw error;

  const { data: existing, error: lookupError } = await supabase
    .from("stripe_webhook_events")
    .select("status, attempts, claimed_at")
    .eq("stripe_event_id", event.id)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (!existing) throw new Error("Stripe webhook event conflict could not be resolved.");
  if (existing.status === "processed") return "processed" as const;
  if (existing.status === "processing") {
    const claimedAt = Date.parse(existing.claimed_at);
    const staleBefore = Date.now() - 5 * 60 * 1000;
    if (!Number.isFinite(claimedAt) || claimedAt > staleBefore) return "processing" as const;

    const { data: recovered, error: recoveryError } = await supabase
      .from("stripe_webhook_events")
      .update({
        claimed_at: new Date().toISOString(),
        attempts: Number(existing.attempts || 0) + 1,
        last_error: "Recovered stale processing claim.",
      })
      .eq("stripe_event_id", event.id)
      .eq("status", "processing")
      .lt("claimed_at", new Date(staleBefore).toISOString())
      .select("stripe_event_id")
      .maybeSingle();
    if (recoveryError) throw recoveryError;
    return recovered ? "claimed" as const : "processing" as const;
  }

  const { data: retried, error: retryError } = await supabase
    .from("stripe_webhook_events")
    .update({
      status: "processing",
      attempts: Number(existing.attempts || 0) + 1,
      last_error: null,
      claimed_at: new Date().toISOString(),
      processed_at: null,
    })
    .eq("stripe_event_id", event.id)
    .eq("status", "failed")
    .select("stripe_event_id")
    .maybeSingle();
  if (retryError) throw retryError;
  return retried ? "claimed" as const : "processing" as const;
}

async function markEventProcessed(supabase: NonNullable<ReturnType<typeof serviceSupabase>>, eventId: string) {
  const { error } = await supabase
    .from("stripe_webhook_events")
    .update({ status: "processed", processed_at: new Date().toISOString(), last_error: null })
    .eq("stripe_event_id", eventId);
  if (error) throw error;
}

async function markEventFailed(supabase: NonNullable<ReturnType<typeof serviceSupabase>>, eventId: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown Stripe webhook processing error";
  const { error: updateError } = await supabase
    .from("stripe_webhook_events")
    .update({ status: "failed", last_error: message.slice(0, 1000) })
    .eq("stripe_event_id", eventId);
  if (updateError) console.error("Could not mark Stripe webhook event as failed", updateError);
}

async function releaseIfCheckoutClosed(
  supabase: NonNullable<ReturnType<typeof serviceSupabase>>,
  order: { id: string; stripe_checkout_session_id?: string | null },
) {
  if (order.stripe_checkout_session_id && stripe) {
    const session = await stripe.checkout.sessions.retrieve(order.stripe_checkout_session_id);
    if (session.status === "open") return false;
    if (session.payment_status === "paid") return false;
  }

  const { error } = await supabase.rpc("release_stripe_stock", { p_order_id: order.id });
  if (error) throw error;
  return true;
}

export async function POST(request: Request) {
  const supabase = serviceSupabase();
  if (!supabase) {
    console.error("Stripe webhook received, but Supabase service credentials are not configured.");
    return NextResponse.json({ received: false }, { status: 503 });
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

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error("Stripe webhook verification failed", error);
    return new Response("Webhook signature verification failed.", { status: 400 });
  }

  let claim: "claimed" | "processed" | "processing";
  try {
    claim = await claimEvent(supabase, event);
  } catch (error) {
    console.error("Could not claim Stripe webhook event", error);
    return NextResponse.json({ received: false }, { status: 500 });
  }
  if (claim === "processed") return NextResponse.json({ received: true }, { status: 200 });
  if (claim === "processing") return NextResponse.json({ received: false }, { status: 409 });

  try {
    const { type, data } = event;
    const object = data.object as {
      id?: string;
      metadata?: Record<string, string | undefined>;
      payment_intent?: string | { id?: string } | null;
      payment_status?: string;
    };

    if (type === "checkout.session.completed" || type === "checkout.session.async_payment_succeeded") {
      if (object.payment_status !== "paid") {
        await markEventProcessed(supabase, event.id);
        return NextResponse.json({ received: true, pending: true }, { status: 200 });
      }

      const orderId = object.metadata?.order_id ?? null;
      const sessionId = object.id ?? null;
      const paymentIntentId = typeof object.payment_intent === "string" ? object.payment_intent : object.payment_intent?.id ?? null;
      const order = await findOrderByStripeContext(supabase, { orderId, sessionId, paymentIntentId });
      if (!order) throw new Error("Stripe payment event has no associated Trinity order.");

      const { error } = await supabase.rpc("complete_stripe_payment", {
        p_order_id: order.id,
        checkout_session_id: sessionId,
        payment_intent_id: paymentIntentId,
      });
      if (error) throw error;
    } else if (type === "checkout.session.expired" || type === "checkout.session.async_payment_failed") {
      const orderId = object.metadata?.order_id ?? null;
      const sessionId = object.id ?? null;
      const paymentIntentId = typeof object.payment_intent === "string" ? object.payment_intent : object.payment_intent?.id ?? null;
      const order = await findOrderByStripeContext(supabase, { orderId, sessionId, paymentIntentId });
      if (order) await releaseIfCheckoutClosed(supabase, order);
    } else if (type === "payment_intent.payment_failed") {
      const paymentIntentId = data.object.id;
      const paymentIntentMetadata = (data.object as { metadata?: Record<string, string | undefined> }).metadata;
      const order = await findOrderByStripeContext(supabase, {
        orderId: paymentIntentMetadata?.order_id,
        paymentIntentId,
      });
      if (order) await releaseIfCheckoutClosed(supabase, order);
    }

    await markEventProcessed(supabase, event.id);
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    await markEventFailed(supabase, event.id, error);
    console.error("Stripe webhook processing failed", error);
    return NextResponse.json({ received: false }, { status: 500 });
  }
}
