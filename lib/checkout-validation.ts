import type { SupabaseClient } from "@supabase/supabase-js";

type CheckoutItem = {
  id?: string;
  variant_id?: string;
  image_id?: string;
  quantity?: number;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function validateCheckoutItems(
  supabase: SupabaseClient,
  items: CheckoutItem[],
) {
  const productIds = Array.from(new Set(items.map((item) => item.id).filter((id): id is string => Boolean(id))));
  const variantIds = Array.from(new Set(items.map((item) => item.variant_id).filter((id): id is string => Boolean(id))));
  const imageIds = Array.from(new Set(items.map((item) => item.image_id).filter((id): id is string => Boolean(id))));
  if ([...productIds, ...variantIds, ...imageIds].some((id) => !uuidPattern.test(id))) return "One or more product, option, or image IDs are invalid.";

  const [{ data: products, error: productsError }, { data: variants, error: variantsError }, { data: images, error: imagesError }] = await Promise.all([
    supabase.from("products").select("id, is_published, stock_status, inventory_mode, stock").in("id", productIds),
    variantIds.length ? supabase.from("product_variants").select("id, product_id, inventory_mode, stock").in("id", variantIds) : Promise.resolve({ data: [], error: null }),
    imageIds.length ? supabase.from("product_variant_images").select("id, variant_id, available_quantity").in("id", imageIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (productsError || variantsError || imagesError) return "Unable to validate current inventory.";

  const productById = new Map((products ?? []).map((product) => [product.id, product]));
  const variantById = new Map((variants ?? []).map((variant) => [variant.id, variant]));
  const imageById = new Map((images ?? []).map((image) => [image.id, image]));

  for (const item of items) {
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return "Each cart quantity must be a positive integer.";
    const product = item.id ? productById.get(item.id) : undefined;
    if (!product || !product.is_published) return "Product is unavailable.";
    const variant = item.variant_id ? variantById.get(item.variant_id) : undefined;
    if (item.variant_id && (!variant || variant.product_id !== product.id)) return "Selected option is invalid for this product.";
    const imageAssigned = Boolean(item.image_id);
    if (item.image_id) {
      const image = imageById.get(item.image_id);
      if (!variant || !image || image.variant_id !== variant.id) return "Selected artwork is invalid for this option.";
      if (image.available_quantity < quantity) return "Selected artwork does not have enough stock.";
    } else if (variant) {
      if (variant.stock < quantity) return "Selected option does not have enough stock.";
    } else if (!imageAssigned && (product.stock ?? 0) < quantity) {
      return "Product does not have enough stock.";
    }
  }
  return null;
}
