import { NextResponse } from "next/server";
import { serviceSupabase } from "@/lib/admin";
import {
  checkoutFailureResponse,
  diagnoseCheckoutFailure,
  getDatabaseErrorCode,
  getSupabaseProjectRef,
  normalizeCheckoutItems,
  type CheckoutFailure,
} from "@/lib/checkout-validation";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  const supabase = serviceSupabase();
  if (!supabase) return NextResponse.json({ error: "Order service is not configured." }, { status: 503 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  if (!isRecord(body)) {
    return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
  }
  const customer = body.customer;
  const requiredCustomerFields = ["name", "phone", "country", "governorate", "city", "address"] as const;
  const items = normalizeCheckoutItems(body.items);
  if (
    !isRecord(customer) ||
    requiredCustomerFields.some((field) => typeof customer[field] !== "string" || !customer[field].trim()) ||
    !items
  ) {
    return NextResponse.json({ error: "Required checkout details and cart items are missing." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("create_checkout_order", { customer, items });
  if (error) {
    let failure: CheckoutFailure;
    try {
      failure = await diagnoseCheckoutFailure(supabase, items, error);
    } catch (diagnosisError) {
      console.error("Could not classify manual checkout reservation failure", {
        databaseCode: getDatabaseErrorCode(diagnosisError),
        projectRef: getSupabaseProjectRef(),
      });
      failure = "technical_failure";
    }
    console.error("Manual checkout stock reservation failed", {
      failure,
      databaseCode: getDatabaseErrorCode(error),
      projectRef: getSupabaseProjectRef(),
    });
    const response = checkoutFailureResponse(failure);
    return NextResponse.json({ error: response.error }, { status: response.status });
  }
  return NextResponse.json(data, { status: 201 });
}
