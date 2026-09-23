import { createClient } from "@supabase/supabase-js";

import type { Occasion, Product } from "./data";

export type CatalogResult<T> = {
  data: T;
  error?: string;
};

export async function getProducts(): Promise<Product[]> {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return [];
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data, error } = await supabase
      .from("products")
      .select("id, slug, name, description, meaning, price, category, stock, image_url, is_featured, is_published, occasion, gift_for, created_at")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load products:", error);
      return [];
    }

    return (data ?? []).map((p: any) => ({
      ...p,
      image: p.image_url || p.image || "",
      featured: Boolean(p.is_featured),
      occasion: Array.isArray(p.occasion) ? p.occasion : [],
      giftFor: Array.isArray(p.gift_for) ? p.gift_for : [],
      gallery: [],
    }));
  }

export async function getProductsResult(): Promise<CatalogResult<Product[]>> {
  try {
    const data = await getProducts();
    return { data };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error.message : "Unable to load products.",
    };
  }
}

export async function getProduct(slug: string): Promise<Product | null> {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return null;
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (productError) {
      console.error("Failed to load product:", productError);
      return null;
    }

    if (!product) return null;

    const { data: gallery, error: galleryError } = await supabase
      .from("product_images")
      .select("id, product_id, image_url, alt_text, sort_order")
      .eq("product_id", product.id)
      .order("sort_order", { ascending: true });

    if (galleryError) {
      console.error("Failed to load product gallery:", galleryError);
    }

    return {
      ...product,
      image: product.image_url || product.image || "",
      featured: Boolean(product.is_featured),
      occasion: Array.isArray(product.occasion) ? product.occasion : [],
      giftFor: Array.isArray(product.gift_for) ? product.gift_for : [],
      gallery: gallery ?? [],
    };
  }

export async function getOccasionsResult(): Promise<CatalogResult<Occasion[]>> {
  try {
    const data = await getOccasions();
    return { data };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error.message : "Unable to load occasions.",
    };
  }
}

export async function getOccasions(): Promise<Occasion[]> {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return [];
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data, error } = await supabase
      .from("occasions")
      .select("*")
      .eq("is_published", true)
      .order("sort_order");

    if (error) {
      console.error("Failed to load occasions:", error);
      return [];
    }

    return (data ?? []).map((o: any) => ({
      slug: o.slug,
      name: o.name,
      subtitle: o.subtitle || "",
      image: o.image_url || o.image || "",
    }));
  }