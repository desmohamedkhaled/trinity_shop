import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/admin';

const shippingStates = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const;

function shippingLocations(value: unknown, productId: string) {
  if (!Array.isArray(value)) return null;

  const locations = new Map<string, { suburb: string; metro: string }>();
  for (const location of value) {
    if (!location || typeof location !== 'object' || !shippingStates.includes((location as { state?: string }).state as typeof shippingStates[number])) return null;
    const { state, suburb, metro } = location as { state: string; suburb?: unknown; metro?: unknown };
    if (typeof suburb !== 'string' || typeof metro !== 'string') return null;
    locations.set(state, { suburb, metro });
  }

  return shippingStates.map((state) => ({ product_id: productId, state, ...(locations.get(state) ?? { suburb: '', metro: '' }), updated_at: new Date().toISOString() }));
}

function dimension(value: unknown) {
  if (value === null || value === '') return null;
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
      product_id: '',
      id: typeof variant.id === 'string' ? variant.id : undefined,
      name,
      price: Number(variant.price),
      stock: Number(variant.stock),
      length: dimension(variant.length),
      width: dimension(variant.width),
      height: dimension(variant.height),
      weight: dimension(variant.weight),
      sort_order: index,
    };
  });
  if (variants.some((variant: any) => !Number.isFinite(variant.price) || variant.price < 0 || !Number.isInteger(variant.stock) || variant.stock < 0)) {
    throw new Error('Each variant needs a valid non-negative price and stock quantity.');
  }
  return variants;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission('products.update');
  if (access.response) return access.response;
  const { supabase } = access;

  const b = await req.json();
  const { id } = await params;
  let variants: any[] | null = null;
  let existingVariants: { id: string }[] = [];
  if (Array.isArray(b.variants)) {
    try {
      variants = validateVariants(b.variants);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid variants.' }, { status: 400 });
    }
    if (!variants) return NextResponse.json({ error: 'Invalid variants.' }, { status: 400 });
    const existing = await supabase.from('product_variants').select('id').eq('product_id', id);
    if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 400 });
    existingVariants = existing.data ?? [];
    const retainedIds = variants.filter((variant: any) => variant.id).map((variant: any) => variant.id);
    if (retainedIds.some((variantId) => !existingVariants.some((variant) => variant.id === variantId))) {
      return NextResponse.json({ error: 'One or more variants do not belong to this product.' }, { status: 400 });
    }
  }
  const allowed = ['slug', 'name', 'description', 'meaning', 'price', 'category', 'stock', 'stock_status', 'image_url', 'is_featured', 'is_published', 'occasion', 'gift_for', 'length', 'width', 'height', 'weight'];
  const row: Record<string, any> = {};

  for (const k of allowed) {
    if (b[k] !== undefined) row[k] = ['price', 'stock'].includes(k) ? Number(b[k]) : ['length', 'width', 'height', 'weight'].includes(k) ? dimension(b[k]) : b[k];
  }
  if (row.slug !== undefined && (typeof row.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug))) {
    return NextResponse.json({ error: 'Slug must use lowercase letters, numbers, and hyphens.' }, { status: 400 });
  }
  if (row.name !== undefined && (typeof row.name !== 'string' || !row.name.trim())) {
    return NextResponse.json({ error: 'Product name cannot be empty.' }, { status: 400 });
  }
  if (row.price !== undefined && (!Number.isFinite(row.price) || row.price < 0)) {
    return NextResponse.json({ error: 'Price must be a non-negative number.' }, { status: 400 });
  }
  if (row.stock !== undefined && (!Number.isInteger(row.stock) || row.stock < 0)) {
    return NextResponse.json({ error: 'Stock must be a non-negative integer.' }, { status: 400 });
  }
  if (row.stock_status !== undefined && !['In stock', 'Out of stock'].includes(row.stock_status)) {
    return NextResponse.json({ error: 'Stock status must be In stock or Out of stock.' }, { status: 400 });
  }
  if (['length', 'width', 'height', 'weight'].some((key) => row[key] === undefined && b[key] !== undefined)) {
    return NextResponse.json({ error: 'Dimensions must be non-negative numbers.' }, { status: 400 });
  }

  const { data, error } = await supabase.from('products').update(row).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (b.product_shipping_locations !== undefined) {
    const locations = shippingLocations(b.product_shipping_locations, id);
    if (!locations) return NextResponse.json({ error: 'Shipping locations must contain valid states with text suburb and metro values.' }, { status: 400 });
    const { error: shippingError } = await supabase.from('product_shipping_locations').upsert(locations, { onConflict: 'product_id,state' });
    if (shippingError) return NextResponse.json({ error: shippingError.message }, { status: 400 });
  }
  if (variants) {
    variants = variants.map((variant) => ({ ...variant, product_id: id }));
    const retainedIds = variants.filter((variant: any) => variant.id).map((variant: any) => variant.id);
    const removed = existingVariants.map((variant) => variant.id).filter((variantId) => !retainedIds.includes(variantId));
    if (removed.length) {
      const { error: deleteError } = await supabase.from('product_variants').delete().in('id', removed);
      if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }
    for (const variant of variants) {
      const { error: variantError } = await supabase.from('product_variants').upsert(variant, { onConflict: 'id' });
      if (variantError) return NextResponse.json({ error: variantError.message }, { status: 400 });
    }
  }
  return NextResponse.json(data);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission('products.delete');
  if (access.response) return access.response;
  const { supabase } = access;

  const { id } = await params;
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
