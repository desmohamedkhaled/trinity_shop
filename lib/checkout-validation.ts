import type { serviceSupabase } from "@/lib/admin";

export type CheckoutItem = { id: string; variant_id?: string; quantity: number };
export type CheckoutFailure = "stock_conflict" | "invalid_product" | "invalid_variant" | "technical_failure";

type SupabaseClient = NonNullable<ReturnType<typeof serviceSupabase>>;

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "";
}

export function getDatabaseErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return "unknown";
}

export function getSupabaseProjectRef() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").hostname.split(".")[0] || "unconfigured";
  } catch {
    return "unconfigured";
  }
}

export function normalizeCheckoutItems(input: unknown): CheckoutItem[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;

  const merged = new Map<string, CheckoutItem>();
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  for (const rawItem of input) {
    if (!rawItem || typeof rawItem !== "object" || Array.isArray(rawItem)) return null;
    const item = rawItem as Record<string, unknown>;
    const id = typeof item.id === "string" ? item.id.trim() : "";
    const quantity = item.quantity;
    const rawVariantId = item.variant_id;
    if (
      !uuidPattern.test(id) ||
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 99 ||
      (rawVariantId !== undefined && rawVariantId !== null && typeof rawVariantId !== "string")
    ) return null;

    const variantId = typeof rawVariantId === "string" ? rawVariantId.trim() : undefined;
    if (variantId !== undefined && !uuidPattern.test(variantId)) return null;

    const key = `${id}:${variantId || ""}`;
    const current = merged.get(key);
    const mergedQuantity = (current?.quantity || 0) + quantity;
    if (mergedQuantity > 99) return null;
    merged.set(key, { id, variant_id: variantId || undefined, quantity: mergedQuantity });
  }
  return Array.from(merged.values()).sort((left, right) => left.id.localeCompare(right.id));
}

export async function diagnoseCheckoutFailure(
  supabase: SupabaseClient,
  items: CheckoutItem[],
  error: unknown,
): Promise<CheckoutFailure> {
  const message = getErrorMessage(error);
  if (
    message !== "Product is unavailable" &&
    message !== "Some products are no longer available. Please refresh your cart." &&
    !message.includes("Selected option is no longer available") &&
    !message.startsWith("Only ")
  ) {
    return "technical_failure";
  }

  const productIds = [...new Set(items.map((item) => item.id))];
  const { data: products, error: productError } = await supabase
    .from("products")
    .select("id,is_published,stock,stock_status")
    .in("id", productIds);
  if (productError) return "technical_failure";

  const productsById = new Map((products ?? []).map((product) => [product.id, product]));
  for (const item of items) {
    const product = productsById.get(item.id);
    if (!product || !product.is_published) return "invalid_product";
    if (product.stock_status !== "In stock") return "stock_conflict";
  }

  const variantItems = items.filter((item): item is CheckoutItem & { variant_id: string } => Boolean(item.variant_id));
  if (variantItems.length) {
    const variantIds = [...new Set(variantItems.map((item) => item.variant_id))];
    const { data: variants, error: variantError } = await supabase
      .from("product_variants")
      .select("id,product_id,stock")
      .in("id", variantIds);
    if (variantError) return "technical_failure";
    const variantsById = new Map((variants ?? []).map((variant) => [variant.id, variant]));
    for (const item of variantItems) {
      const variant = variantsById.get(item.variant_id);
      if (!variant || variant.product_id !== item.id) return "invalid_variant";
      if (variant.stock < item.quantity) return "stock_conflict";
    }
  }

  for (const item of items) {
    if (!item.variant_id && (productsById.get(item.id)?.stock ?? 0) < item.quantity) {
      return "stock_conflict";
    }
  }

  return "technical_failure";
}

export function checkoutFailureResponse(failure: CheckoutFailure) {
  if (failure === "stock_conflict") {
    return {
      status: 409,
      error: "One or more cart items are out of stock or no longer have enough stock. Return to your cart and adjust your selection.",
    };
  }
  if (failure === "invalid_product" || failure === "invalid_variant") {
    return {
      status: 409,
      error: "A cart product or selected option is no longer available. Return to the product page and select it again.",
    };
  }
  return {
    status: 500,
    error: "We couldn't verify stock for this checkout. Please try again, or contact us if the problem continues.",
  };
}
