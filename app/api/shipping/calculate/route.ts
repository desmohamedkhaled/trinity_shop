import { NextResponse } from "next/server";
import { serviceSupabase } from "@/lib/admin";
import { calculateParcel, listEflowServices, quoteEflowService, type EflowService } from "@/lib/eflow";

type ShippingItem = { id: string; variant_id?: string; image_id?: string; quantity: number };

export async function POST(request: Request) {
  const supabase = serviceSupabase();
  if (!supabase) return NextResponse.json({ error: "Shipping service is not configured." }, { status: 503 });
  let body: { to_postcode?: unknown; items?: unknown; service?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const toPostcode = typeof body.to_postcode === "string" ? body.to_postcode.trim() : "";
  if (!/^\d{4}$/.test(toPostcode)) return NextResponse.json({ error: "A valid 4-digit Australian delivery postcode is required." }, { status: 422 });
  if (!Array.isArray(body.items) || body.items.length === 0) return NextResponse.json({ error: "Cart items are required." }, { status: 400 });

  const items: ShippingItem[] = [];
  for (const raw of body.items) {
    if (!raw || typeof raw !== "object") return NextResponse.json({ error: "Invalid cart item." }, { status: 400 });
    const item = raw as ShippingItem;
    const quantity = Number(item.quantity);
    if (typeof item.id !== "string" || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return NextResponse.json({ error: "Invalid cart item or quantity." }, { status: 400 });
    }
    items.push({ id: item.id, variant_id: item.variant_id, image_id: item.image_id, quantity });
  }

  const parcelResult = await calculateParcel(supabase, items.map((item) => ({ id: item.id, variant_id: item.variant_id, quantity: item.quantity })));
  if ("error" in parcelResult) return NextResponse.json({ error: parcelResult.error }, { status: 422 });
  const parcel = { ...parcelResult.parcel, to_postcode: toPostcode };

  if (typeof body.service === "string" && body.service.trim()) {
    const serviceCode = body.service.trim();
    const services = await listEflowServices(parcel);
    if (services.error) return NextResponse.json({ error: services.error }, { status: services.status });
    const servicePayload = services.payload as { services?: EflowService[] };
    const available = (servicePayload.services ?? []).some((service) => service.service === serviceCode);
    if (!available) return NextResponse.json({ error: "The selected shipping service is not available for this parcel and postcode." }, { status: 422 });

    const quote = await quoteEflowService(parcel, serviceCode);
    if (quote.error) return NextResponse.json({ error: quote.error }, { status: quote.status });
    const quoteBody = quote.payload as { quote?: { service?: string; name?: string; speed?: string; total?: number; currency?: string; gst_included?: boolean; delivery_estimate?: string } };
    const selected = quoteBody.quote;
    if (!selected || typeof selected.total !== "number" || !Number.isFinite(selected.total) || selected.total < 0) {
      return NextResponse.json({ error: "eFlow returned an invalid quote." }, { status: 502 });
    }
    return NextResponse.json({ parcel, quote: { service: selected.service, name: selected.name, speed: selected.speed, price: selected.total, currency: selected.currency || "AUD", gst_included: selected.gst_included !== false, delivery_estimate: selected.delivery_estimate } });
  }

  const result = await listEflowServices(parcel);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  const payload = result.payload as { services?: EflowService[] };
  const services = (payload.services ?? [])
    .filter((service) => typeof service.service === "string" && Number.isFinite(service.price) && service.price >= 0)
    .map((service) => ({
      service: service.service,
      name: service.name,
      speed: service.speed,
      price: service.price,
      currency: service.currency || "AUD",
      gst_included: service.gst_included !== false,
    }));
  return NextResponse.json({ parcel, services });
}
