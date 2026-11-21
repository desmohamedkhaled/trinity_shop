import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requirePermission("orders.update");
  if (access.response) return access.response;
  const { supabase } = access;
  const { id } = await params;

  const { data: order, error } = await supabase
    .from("orders")
    .select("id,preorder_status,balance_payment_status,balance_payment_token_hash,balance_payment_token_expires_at")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!order) return NextResponse.json({ error: "Order was not found." }, { status: 404 });
  if (order.preorder_status !== "stock_received") {
    return NextResponse.json({ error: "The remaining balance can be issued only after stock is received." }, { status: 409 });
  }
  if (order.balance_payment_status === "paid") {
    return NextResponse.json({ error: "The remaining balance has already been paid." }, { status: 409 });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      balance_payment_status: "pending",
      balance_due_at: new Date().toISOString(),
      balance_payment_token_hash: tokenHash,
      balance_payment_token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return NextResponse.json({
    ok: true,
    balanceUrl: `${origin.replace(/\/$/, "")}/checkout/balance?token=${encodeURIComponent(token)}`,
    expiresAt,
  });
}
