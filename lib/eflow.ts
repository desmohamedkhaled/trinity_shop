const EFLOW_BASE_URL = "https://freight.eflowsoft.com.au/api/v1";

export type EflowService = {
  service: string;
  name: string;
  speed?: string;
  price: number;
  currency?: string;
  gst_included?: boolean;
  delivery_estimate?: string;
};

export type Parcel = {
  from_postcode: string;
  to_postcode: string;
  length: number;
  width: number;
  height: number;
  weight: number;
};

function eflowError(responseStatus: number, payload: unknown) {
  const body = payload && typeof payload === "object" ? payload as { error?: { code?: string; message?: string } } : {};
  const code = body.error?.code;
  const message = body.error?.message;
  if (responseStatus === 401 || code === "invalid_api_key") return { status: 503, error: "eFlow authentication is unavailable. Check EFLOW_FREIGHT_API_KEY." };
  if (responseStatus === 402 || code === "insufficient_credits") return { status: 503, error: "eFlow account has insufficient credits." };
  if (responseStatus === 403 || code === "account_suspended") return { status: 503, error: "eFlow account is suspended." };
  if (responseStatus === 422) return { status: 422, error: message || "The parcel or destination postcode is invalid." };
  if (responseStatus === 429 || code === "rate_limited") return { status: 429, error: "eFlow rate limit reached. Try again shortly." };
  if (responseStatus === 502 || code === "upstream_unavailable") return { status: 502, error: "eFlow rates are temporarily unavailable." };
  return { status: 502, error: message || "Live shipping is temporarily unavailable." };
}

async function eflowGet(path: string, parcel: Parcel, service?: string) {
  const key = process.env.EFLOW_FREIGHT_API_KEY;
  if (!key) return { status: 503, payload: null, error: "eFlow is not configured. EFLOW_FREIGHT_API_KEY is missing." };
  const params = new URLSearchParams({
    from_postcode: parcel.from_postcode,
    to_postcode: parcel.to_postcode,
    length: String(parcel.length),
    width: String(parcel.width),
    height: String(parcel.height),
    weight: String(parcel.weight),
  });
  if (service) params.set("service", service);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${EFLOW_BASE_URL}/${path}?${params.toString()}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const mapped = eflowError(response.status, payload);
      return { status: mapped.status, payload: null, error: mapped.error };
    }
    return { status: 200, payload, error: null };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { status: 504, payload: null, error: "eFlow timed out. Please try again." };
    }
    return { status: 502, payload: null, error: "Live shipping is temporarily unavailable." };
  } finally {
    clearTimeout(timeout);
  }
}

export async function listEflowServices(parcel: Parcel) {
  return eflowGet("services", parcel);
}

export async function quoteEflowService(parcel: Parcel, service: string) {
  if (!/^[a-z0-9_]+$/i.test(service)) {
    return { status: 400, payload: null, error: "Invalid shipping service." };
  }
  return eflowGet("quote", parcel, service);
}

export type ShippingCartItem = { id: string; variant_id?: string; quantity: number };

export function gramsToEflowKg(weightGrams: number) {
  if (!Number.isFinite(weightGrams) || weightGrams <= 0) return null;
  return weightGrams / 1000;
}

export function positiveWeightGrams(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

export async function calculateParcel(
  supabase: SupabaseClient,
  items: ShippingCartItem[],
) {
  if (items.length === 0) {
    return { error: "Live shipping requires at least one cart item." as const };
  }
  if (items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99)) {
    return { error: "Each cart quantity must be an integer from 1 to 99." as const };
  }
  const productIds = Array.from(new Set(items.map((item) => item.id)));
  const variantIds = Array.from(new Set(items.map((item) => item.variant_id).filter((id): id is string => Boolean(id))));
  const [{ data: products, error: productError }, { data: variants, error: variantError }] = await Promise.all([
    supabase.from("products").select("id,length,width,height,weight").in("id", productIds),
    variantIds.length ? supabase.from("product_variants").select("id,product_id,length,width,height,weight").in("id", variantIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (productError || variantError) return { error: "Unable to validate parcel dimensions." as const };

  const productById = new Map((products ?? []).map((product) => [product.id, product]));
  const variantById = new Map((variants ?? []).map((variant) => [variant.id, variant]));
  let parcelLength: number | null = null;
  let parcelWidth: number | null = null;
  let parcelHeight: number | null = null;
  let totalWeightGrams = 0;

  for (const item of items) {
    const product = productById.get(item.id);
    const variant = item.variant_id ? variantById.get(item.variant_id) : undefined;
    if (!product || (item.variant_id && (!variant || variant.product_id !== product.id))) {
      return { error: "A cart item or option is invalid." as const };
    }
    const variantWeight = variant ? positiveWeightGrams(variant.weight) : null;
    const productWeight = positiveWeightGrams(product.weight);
    const weightGrams = variant ? (variantWeight ?? productWeight) : productWeight;
    const values = [
      variant ? variant.length : product.length,
      variant ? variant.width : product.width,
      variant ? variant.height : product.height,
    ];
    if (values.some((value) => typeof value !== "number" || !Number.isFinite(value) || value <= 0)) {
      return { error: "Live shipping requires confirmed positive length, width and height for the selected product or option." as const };
    }
    if (weightGrams === null) {
      return { error: "Live shipping requires a positive weight in grams for the selected product or option." as const };
    }
    const length = Number(values[0]);
    const width = Number(values[1]);
    const height = Number(values[2]);
    if (parcelLength !== null && (length !== parcelLength || width !== parcelWidth || height !== parcelHeight)) {
      return { error: "Live shipping is unavailable when cart items have conflicting confirmed package dimensions." as const };
    }
    parcelLength = length;
    parcelWidth = width;
    parcelHeight = height;
    totalWeightGrams += weightGrams * item.quantity;
  }

  const weightKg = gramsToEflowKg(totalWeightGrams);
  if (weightKg === null) {
    return { error: "Live shipping requires a valid positive weight in grams." as const };
  }
  if (parcelLength === null || parcelWidth === null || parcelHeight === null) {
    return { error: "Live shipping requires confirmed parcel dimensions." as const };
  }
  if (parcelLength > 105 || parcelWidth > 105 || parcelHeight > 105 || weightKg > 22 || parcelLength * parcelWidth * parcelHeight > 250000) {
    return { error: "The parcel exceeds eFlow's documented size or weight limits." as const };
  }
  const fromPostcode = process.env.EFLOW_FROM_POSTCODE;
  if (!fromPostcode || !/^\d{4}$/.test(fromPostcode)) return { error: "EFLOW_FROM_POSTCODE is missing or invalid." as const };
  return {
    parcel: {
      from_postcode: fromPostcode,
      to_postcode: "",
      length: Number(parcelLength.toFixed(2)),
      width: Number(parcelWidth.toFixed(2)),
      height: Number(parcelHeight.toFixed(2)),
      weight: Number(weightKg.toFixed(3)),
    } satisfies Parcel,
  };
}
import type { SupabaseClient } from "@supabase/supabase-js";

