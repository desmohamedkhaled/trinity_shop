import { NextResponse } from "next/server";
import { serviceSupabase } from "@/lib/admin";
import { stripe } from "@/lib/stripe";
import { validateCheckoutItems } from "@/lib/checkout-validation";
import { calculateParcel, quoteEflowService } from "@/lib/eflow";
import { resolveServerPreorders } from "@/lib/preorder";

type Customer = {
  name?: string;
  phone?: string;
  email?: string;
  country?: string;
  governorate?: string;
  city?: string;
  address?: string;
  postcode?: string;
};

type Item = { id?: string; variant_id?: string; image_id?: string; quantity?: number; is_deposit?: boolean; deposit_percentage?: number; remaining_balance?: number };

function normalizeItems(items: Item[]) {
  const merged = new Map<string, { id: string; variant_id?: string; image_id?: string; quantity: number; is_deposit?: boolean; deposit_percentage?: number; remaining_balance?: number }>();
  for (const item of items) {
    const id = typeof item.id === "string" ? item.id.trim() : "";
    const quantity = Number(item.quantity);
    if (!id || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) return null;
    const key = `${id}:${item.variant_id || ""}:${item.image_id || ""}:${item.is_deposit ? "deposit" : "full"}`;
    const current = merged.get(key);
    merged.set(key, {
      id,
      variant_id: item.variant_id,
      image_id: item.image_id,
      quantity: (current?.quantity || 0) + quantity,
      is_deposit: item.is_deposit === true,
      deposit_percentage: item.is_deposit === true ? item.deposit_percentage ?? 0 : 0,
      remaining_balance: 0,
    });
  }
  return Array.from(merged.values()).sort((left, right) => left.id.localeCompare(right.id));
}

export async function POST(request: Request) {
  const supabase = serviceSupabase();
  if (!supabase) return NextResponse.json({ error: "Checkout service is not configured." }, { status: 503 });
  if (!stripe) return NextResponse.json({ error: "Stripe is not configured for checkout." }, { status: 503 });

  let body: { customer?: Customer; shipping_service?: unknown; items?: Item[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const customer = body.customer || {};
  const requiredCustomer = ["name", "phone", "country", "governorate", "city", "postcode", "address"] as const;
  if (requiredCustomer.some((key) => !customer[key]?.trim()) || !Array.isArray(body.items) || !body.items.length) {
    return NextResponse.json({ error: "Required checkout details and cart items are missing." }, { status: 400 });
  }

  const items = normalizeItems(body.items);
  if (!items) return NextResponse.json({ error: "Each cart item must have a valid quantity." }, { status: 400 });
  if (typeof body.shipping_service !== "string" || !body.shipping_service.trim()) {
    return NextResponse.json({ error: "Select an available live shipping service." }, { status: 422 });
  }
  if (!/^\d{4}$/.test(String(customer.postcode))) {
    return NextResponse.json({ error: "A valid 4-digit Australian postcode is required." }, { status: 422 });
  }
  const validationError = await validateCheckoutItems(supabase, items);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 409 });
  const preorderResolution = await resolveServerPreorders(supabase, items);
  if ("error" in preorderResolution) return NextResponse.json({ error: preorderResolution.error }, { status: 422 });
  const parcelResult = await calculateParcel(supabase, items);
  if ("error" in parcelResult) return NextResponse.json({ error: parcelResult.error }, { status: 422 });
  parcelResult.parcel.to_postcode = String(customer.postcode);
  const quote = await quoteEflowService(parcelResult.parcel, body.shipping_service as string);
  if (quote.error) return NextResponse.json({ error: quote.error }, { status: quote.status });
  const quoteBody = quote.payload as { quote?: { total?: number } };
  if (!quoteBody.quote || !Number.isFinite(quoteBody.quote.total) || quoteBody.quote.total! < 0) {
    return NextResponse.json({ error: "eFlow returned an invalid shipping quote." }, { status: 502 });
  }
  const shipping = Number(quoteBody.quote.total);

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
  const lineItems = reservation.items.map((item) => {
    const serverPreorder = preorderResolution.items.find((candidate) =>
      candidate.id === String(item.product_id) &&
      (candidate.variant_id || "") === (String(item.variant_id || "")),
    );
    const unitPrice = serverPreorder?.is_deposit
      ? serverPreorder.deposit_amount
      : Number(item.unit_price);
    return {
      price_data: {
      currency: "AUD",
      unit_amount: Math.round(unitPrice * 100),
      product_data: {
        name: String(item.product_name),
        images: item.product_image ? [String(item.product_image)] : undefined,
      },
      },
      quantity: Number(item.quantity),
    };
  });
  lineItems.push({
    price_data: {
      currency: "aud",
      unit_amount: Math.round(shipping * 100),
      product_data: { name: "Live shipping", images: undefined },
    },
    quantity: 1,
  });

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
        shipping,
        total: Number(order.subtotal || 0) + shipping,
        currency: "AUD",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("stock_reservation_status", "reserved")
      .select("id")
      .maybeSingle();

    if (updateError || !attachedOrder) throw new Error("Unable to attach Stripe session to the order.");
    const depositItems = reservation.items.map((reservedItem) => {
      const serverPreorder = preorderResolution.items.find((candidate) =>
        candidate.id === String(reservedItem.product_id) &&
        (candidate.variant_id || "") === (String(reservedItem.variant_id || "")),
      );
        const isDeposit = serverPreorder?.is_deposit === true;
      return {
        id: String(reservedItem.id),
        is_deposit: isDeposit,
          deposit_percentage: serverPreorder?.deposit_percentage ?? 0,
          remaining_balance: serverPreorder?.remaining_balance ?? 0,
      };
    });
    const { error: preorderError } = await Promise.all(depositItems.map((item) => supabase.from("order_items").update({
      is_deposit: item.is_deposit,
      deposit_percentage: item.deposit_percentage,
      remaining_balance: item.remaining_balance,
    }).eq("id", item.id))).then((results) => ({
      error: results.find((result) => result.error)?.error || null,
    }));
    if (preorderError) throw new Error("Unable to persist the selected preorder payment option.");
    if (depositItems.some((item) => item.is_deposit)) {
      const { error: preorderStatusError } = await supabase.from("orders").update({
        preorder_status: "deposit_pending",
        balance_payment_status: "pending",
        updated_at: new Date().toISOString(),
      }).eq("id", orderId).eq("stock_reservation_status", "reserved");
      if (preorderStatusError) throw new Error("Unable to persist the preorder status.");
    }

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
