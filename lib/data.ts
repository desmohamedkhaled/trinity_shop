export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  occasion: string[];
  giftFor: string[];
  price: number;
  image: string;
  description: string;
  meaning: string;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  weight?: number | null;
  product_shipping_locations?: ProductShippingLocation[];
  featured?: boolean;
  stock?: number;
  gallery?: ProductImage[];
  stock_status?: "In stock" | "Out of stock";
  variants?: ProductVariant[];
};

export function isComingSoonProduct(product: Pick<Product, "category" | "occasion">) {
  return product.category === "Coming Soon" || product.occasion?.includes("Coming Soon") === true;
}

export type ProductShippingLocation = {
  id?: string;
  product_id?: string;
  state: "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT";
  suburb: string;
  metro: string;
};

export type ProductImage = {
  id: string;
  product_id: string;
  image_url: string;
  alt_text?: string | null;
  sort_order: number;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  name: string;
  price: number;
  stock: number;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  weight?: number | null;
  images?: ProductImage[];
};

export type Occasion = {
  slug: string;
  name: string;
  subtitle: string;
  image: string;
};
