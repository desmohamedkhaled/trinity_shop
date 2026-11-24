import type { SupabaseClient } from "@supabase/supabase-js";

export type PreorderCheckoutItem = {
  id?: string;
  variant_id?: string;
  quantity?: number;
  is_deposit?: boolean;
};

export type ServerPreorderItem = {
  id: string;
  variant_id?: string;
  quantity: number;
  is_deposit: boolean;
  deposit_percentage: number;
  unit_price: number;
  deposit_amount: number;
  remaining_balance: number;
};

export async function resolveServerPreorders(
  supabase: SupabaseClient,
  items: PreorderCheckoutItem[],
) {
  const productIds = Array.from(new Set(items.map((item) => item.id).filter((id): id is string => Boolean(id))));
  const variantIds = Array.from(new Set(items.map((item) => item.variant_id).filter((id): id is string => Boolean(id))));
  const [{ data: products, error: productError }, { data: variants, error: variantError }] = await Promise.all([
    supabase.from("products").select("id,price,occasion,category").in("id", productIds),
    variantIds.length ? supabase.from("product_variants").select("id,product_id,price").in("id", variantIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (productError || variantError) return { error: "Unable to verify preorder prices." as const };

  const preorderOptions = await supabase
    .from("products")
    .select("id,preorder_eligible,deposit_percentage")
    .in("id", productIds);
  const preorderOptionsById = new Map(
    preorderOptions.error ? [] : (preorderOptions.data ?? []).map((product) => [product.id, product]),
  );
  const productById = new Map((products ?? []).map((product) => {
    const options = preorderOptionsById.get(product.id);
    return [product.id, { ...product, ...options }];
  }));
  const variantById = new Map((variants ?? []).map((variant) => [variant.id, variant]));
  const resolved: ServerPreorderItem[] = [];
  for (const item of items) {
    if (!item.id) return { error: "A preorder product is invalid." as const };
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return { error: "Each cart quantity must be a positive integer." as const };
    }
    const product = productById.get(item.id);
    if (!product) return { error: "A preorder product is unavailable." as const };
    const variant = item.variant_id ? variantById.get(item.variant_id) : undefined;
    if (item.variant_id && (!variant || variant.product_id !== item.id)) {
      return { error: "Selected option is invalid for this preorder." as const };
    }
    const comingSoon = product.category === "Coming Soon" || (Array.isArray(product.occasion) && product.occasion.includes("Coming Soon"));
    if (item.is_deposit === true) {
      if (!comingSoon) return { error: "A deposit is available only for Coming Soon products." as const };
      if (product.preorder_eligible !== true) return { error: "This Coming Soon product is not eligible for booking." as const };
    }
    const unitPrice = variant ? Number(variant.price) : Number(product.price);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return { error: "The selected preorder price is invalid." as const };
    }
    const isDeposit = item.is_deposit === true;
    const depositPercentage = isDeposit
      ? Math.max(1, Math.min(100, Number(product.deposit_percentage ?? 50)))
      : 0;
    const depositAmount = isDeposit
      ? Math.round(unitPrice * depositPercentage) / 100
      : unitPrice;
    const remainingBalance = isDeposit ? Math.round((unitPrice - depositAmount) * quantity * 100) / 100 : 0;
    resolved.push({
      id: item.id,
      variant_id: item.variant_id,
      quantity,
      is_deposit: isDeposit,
      deposit_percentage: depositPercentage,
      unit_price: unitPrice,
      deposit_amount: depositAmount,
      remaining_balance: remainingBalance,
    });
  }
  return { items: resolved };
}
