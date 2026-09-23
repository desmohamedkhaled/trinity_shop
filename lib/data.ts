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
  featured?: boolean;
  stock?: number;
  gallery?: ProductImage[];
};

export type ProductImage = {
  id: string;
  product_id: string;
  image_url: string;
  alt_text?: string | null;
  sort_order: number;
};

export type Occasion = {
  slug: string;
  name: string;
  subtitle: string;
  image: string;
};