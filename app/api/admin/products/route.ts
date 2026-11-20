import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/admin';

function dimension(value: unknown) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function validateVariants(value: unknown) {
  if (!Array.isArray(value)) return null;
  const names = new Set<string>();
  const ids = new Set<string>();
  const variants = value.map((variant: any, index: number) => {
    const name = String(variant.name || '').trim();
    const normalizedName = name.toLocaleLowerCase();
    if (!name || names.has(normalizedName)) throw new Error(`Variant names must be unique. Duplicate at row ${index + 1}.`);
    names.add(normalizedName);
    if (typeof variant.id === 'string') {
      if (ids.has(variant.id)) throw new Error('Variant IDs must be unique.');
      ids.add(variant.id);
    }
    const parsedDimensions = ['length', 'width', 'height', 'weight'].map((key) => ({
      input: variant[key],
      value: dimension(variant[key]),
    }));
    if (parsedDimensions.some(({ input, value }) => input !== undefined && input !== null && input !== '' && value === undefined)) {
      throw new Error('Variant dimensions must be non-negative numbers.');
    }
    return {
      id: typeof variant.id === 'string' ? variant.id : undefined,
      name,
      price: Number(variant.price),
      stock: 0,
      length: dimension(variant.length),
      width: dimension(variant.width),
      height: dimension(variant.height),
      weight: dimension(variant.weight),
      inventory_mode: "photo",
      sort_order: index,
    };
  });
  if (variants.some((variant: any) => !Number.isFinite(variant.price) || variant.price < 0)) {
    throw new Error('Each variant needs a valid non-negative price.');
  }
  return variants;
}

export async function GET() {
  const access = await requirePermission('products.read');
  if (access.response) return access.response;
  const { supabase } = access;

  let { data, error } = await supabase.from('products').select('*, product_images(id, product_id, image_url, alt_text, sort_order), product_variants(id, product_id, name, price, stock, length, width, height, weight, sort_order, inventory_mode, product_variant_images(id, variant_id, image_url, alt_text, sort_order, available_quantity, low_stock_threshold))').order('created_at', { ascending: false });
  if (error?.code === 'PGRST200') {
    const fallback = await supabase.from('products').select('*, product_images(id, product_id, image_url, alt_text, sort_order)').order('created_at', { ascending: false });
    data = fallback.data;
    error = fallback.error;
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  console.info('[Gallery] Product creation request received');
  const access = await requirePermission('products.create');
  if (access.response) return access.response;
  const { supabase } = access;

  const b = await req.json();
  let variants: any[] | null = null;
  if (Array.isArray(b.variants)) {
    try {
      variants = validateVariants(b.variants);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid variants.' }, { status: 400 });
    }
  }
  console.info('[Gallery] Product payload parsed');
  const price = Number(b.price);
  const stock = 0;
  const dimensions = {
    length: dimension(b.length),
    width: dimension(b.width),
    height: dimension(b.height),
    weight: dimension(b.weight),
  };
  if (typeof b.name !== 'string' || !b.name.trim() || typeof b.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(b.slug)) {
    return NextResponse.json({ error: 'Name and a valid lowercase slug are required.' }, { status: 400 });
  }
  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: 'Price must be a valid non-negative number.' }, { status: 400 });
  }
  if (b.stock_status !== undefined && !['In stock', 'Out of stock'].includes(b.stock_status)) {
    return NextResponse.json({ error: 'Stock status must be In stock or Out of stock.' }, { status: 400 });
  }
  if (Object.values(dimensions).some((value) => value === undefined)) {
    return NextResponse.json({ error: 'Dimensions must be non-negative numbers.' }, { status: 400 });
  }
  const row = {
    slug: b.slug.trim(),
    name: b.name.trim(),
    sku: typeof b.sku === 'string' && b.sku.trim() ? b.sku.trim() : null,
    arabic_title: typeof b.arabic_title === 'string' && b.arabic_title.trim() ? b.arabic_title.trim() : null,
    description: b.description || null,
    meaning: b.meaning || null,
    price,
    category: b.category || null,
    stock,
    stock_status: 'In stock',
    inventory_mode: 'photo',
    image_url: b.image_url || null,
    is_featured: Boolean(b.is_featured),
    is_published: b.is_published !== false,
    occasion: Array.isArray(b.occasion) ? b.occasion : [],
    gift_for: Array.isArray(b.gift_for) ? b.gift_for : [],
    ...dimensions,
  };

  const { data, error } = await supabase.from('products').insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (variants && variants.length > 0) {
    const productVariants = variants.map((variant: any) => ({
      product_id: data.id,
      id: typeof variant.id === 'string' ? variant.id : undefined,
      name: variant.name,
      price: variant.price,
      stock: variant.stock,
      length: variant.length,
      width: variant.width,
      height: variant.height,
      weight: variant.weight,
      inventory_mode: variant.inventory_mode,
      sort_order: variant.sort_order,
    }));
    const { error: variantError } = await supabase.from('product_variants').insert(productVariants);
    if (variantError) return NextResponse.json({ error: variantError.message }, { status: 400 });
  }
  console.info('[Gallery] Product created:', data.id);
  const { data: savedVariants } = await supabase.from('product_variants').select('id, product_id, name, price, stock, length, width, height, weight, sort_order').eq('product_id', data.id).order('sort_order');
  return NextResponse.json({ ...data, product_variants: savedVariants ?? [] });
}
