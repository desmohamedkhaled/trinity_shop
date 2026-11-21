import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/admin';

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
      stock: undefined,
      length: dimension(variant.length),
      width: dimension(variant.width),
      height: dimension(variant.height),
      weight: dimension(variant.weight),
      inventory_mode: undefined,
      sort_order: index,
    };
  });
  if (variants.some((variant: any) => !Number.isFinite(variant.price) || variant.price < 0)) {
    throw new Error('Each variant needs a valid non-negative price.');
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
  let existingVariants: { id: string; stock: number; inventory_mode: "traditional" | "photo" }[] = [];
  if (Array.isArray(b.variants)) {
    try {
      variants = validateVariants(b.variants);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid variants.' }, { status: 400 });
    }
    if (!variants) return NextResponse.json({ error: 'Invalid variants.' }, { status: 400 });
    const existing = await supabase.from('product_variants').select('id, stock, inventory_mode').eq('product_id', id);
    if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 400 });
    existingVariants = existing.data ?? [];
    const retainedIds = variants.filter((variant: any) => variant.id).map((variant: any) => variant.id);
    if (retainedIds.some((variantId) => !existingVariants.some((variant) => variant.id === variantId))) {
      return NextResponse.json({ error: 'One or more variants do not belong to this product.' }, { status: 400 });
    }
  }
  const allowed = ['slug', 'name', 'sku', 'arabic_title', 'description', 'meaning', 'price', 'category', 'image_url', 'is_featured', 'is_published', 'occasion', 'gift_for', 'length', 'width', 'height', 'weight'];
  const row: Record<string, any> = {};

  for (const k of allowed) {
    if (b[k] !== undefined) row[k] = k === 'price' ? Number(b[k]) : ['length', 'width', 'height', 'weight'].includes(k) ? dimension(b[k]) : b[k];
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
  if (['length', 'width', 'height', 'weight'].some((key) => row[key] === undefined && b[key] !== undefined)) {
    return NextResponse.json({ error: 'Dimensions must be non-negative numbers.' }, { status: 400 });
  }

  const { error: inventoryModeError } = await supabase
    .from('products')
    .update({ inventory_mode: 'photo' })
    .eq('id', id);
  if (inventoryModeError) return NextResponse.json({ error: inventoryModeError.message }, { status: 400 });

  const { data, error } = await supabase.from('products').update(row).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (variants) {
    variants = variants.map((variant) => {
      const existing = existingVariants.find((item) => item.id === variant.id);
      return {
        ...variant,
        product_id: id,
        stock: existing?.stock ?? 0,
        inventory_mode: 'photo',
      };
    });
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
  const { data: savedVariants, error: savedVariantsError } = await supabase
    .from('product_variants')
    .select('id, product_id, name, price, stock, length, width, height, weight, sort_order')
    .eq('product_id', id)
    .order('sort_order');
  if (savedVariantsError) return NextResponse.json({ error: savedVariantsError.message }, { status: 400 });
  return NextResponse.json({ ...data, product_variants: savedVariants ?? [] });
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
