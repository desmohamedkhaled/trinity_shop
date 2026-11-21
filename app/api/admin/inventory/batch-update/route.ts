import { NextResponse } from "next/server";
import { requirePermission, serviceSupabase } from "@/lib/admin";

export async function POST(request: Request) {
  const access = await requirePermission("inventory.update");
  if (access.response) return access.response;

  let body: { changes?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!Array.isArray(body.changes) || body.changes.length === 0) {
    return NextResponse.json({ error: "At least one inventory change is required." }, { status: 400 });
  }

  const changes = body.changes.map((change) => {
    if (!change || typeof change !== "object") return null;
    const item = change as { imageId?: unknown; productId?: unknown; value?: unknown; expectedValue?: unknown };
    const value = Number(item.value);
    const expectedValue = Number(item.expectedValue);
    if ((!item.imageId && !item.productId) || (item.imageId && item.productId) ||
      typeof (item.imageId || item.productId) !== "string" ||
      !Number.isInteger(value) || value < 0 || value > 100000 ||
      !Number.isInteger(expectedValue) || expectedValue < 0 || expectedValue > 100000) {
      return null;
    }
    return { image_id: item.imageId || null, product_id: item.productId || null, value, expected_value: expectedValue };
  });

  if (changes.some((change) => !change)) {
    return NextResponse.json({ error: "Every change must include a valid target, value, and expected value." }, { status: 400 });
  }

  const service = serviceSupabase();
  if (!service) return NextResponse.json({ error: "Server inventory configuration is missing." }, { status: 503 });
  const { data, error } = await service.rpc("admin_batch_update_inventory", { p_changes: changes });
  if (error) {
    if (error.code === "42883" || error.message.includes("admin_batch_update_inventory")) {
      return NextResponse.json({ error: "Batch inventory saving is not enabled in this DEV schema. Review and apply the migration first." }, { status: 503 });
    }
    if (error.message.toLowerCase().includes("changed elsewhere")) {
      return NextResponse.json({ error: "Inventory changed elsewhere. Reload before saving these quantities." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, updated: data?.updated ?? changes.length });
}
