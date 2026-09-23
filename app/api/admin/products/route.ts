import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/admin';

const shippingStates = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const;

function shippingLocations(value: unknown, productId: string) {
  if (!Array.isArray(value)) return null;

  const locations = new Map<string, { suburb: string; metro: string }>();
  for (const location of value) {
    if (!location || typeof location !== 'object' || !shippingStates.includes((location as { state?: string }).state as typeof shippingStates[number])) {
      return null;
    }
    const { state, suburb, metro } = location as { state: string; suburb?: unknown; metro?: unknown };
    if (typeof suburb !== 'string' || typeof metro !== 'string') return null;
    locations.set(state, { suburb, metro });
  }

  return shippingStates.map((state) => ({ product_id: productId, state, ...(locations.get(state) ?? { suburb: '', metro: '' }), updated_at: new Date().toISOString() }));
}

function dimension(value: unknown) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export async function GET() {
  const access = await requirePermission('products.read');
  if (access.response) return access.response;
  const { supabase } = access;

  const { data, error } = await supabase.from('products').select('*, product_images(id, product_id, image_url, alt_text, sort_order), product_shipping_locations(id, product_id, state, suburb, metro)').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  console.info('[Gallery] Product creation request received');
  const access = await requirePermission('products.create');
  if (access.response) return access.response;
  const { supabase } = access;

  const b = await req.json();
  console.info('[Gallery] Product payload parsed');
  const price = Number(b.price);
  const stock = Number(b.stock);
  const dimensions = {
    length: dimension(b.length),
    width: dimension(b.width),
    height: dimension(b.height),
    weight: dimension(b.weight),
  };
  if (typeof b.name !== 'string' || !b.name.trim() || typeof b.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(b.slug)) {
    return NextResponse.json({ error: 'Name and a valid lowercase slug are required.' }, { status: 400 });
  }
  if (!Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
    return NextResponse.json({ error: 'Price and stock must be valid non-negative numbers.' }, { status: 400 });
  }
  if (Object.values(dimensions).some((value) => value === undefined)) {
    return NextResponse.json({ error: 'Dimensions must be non-negative numbers.' }, { status: 400 });
  }
  if (!shippingLocations(b.product_shipping_locations, '')) {
    return NextResponse.json({ error: 'Shipping locations must contain valid states with text suburb and metro values.' }, { status: 400 });
  }
  const row = {
    slug: b.slug.trim(),
    name: b.name.trim(),
    description: b.description || null,
    meaning: b.meaning || null,
    price,
    category: b.category || null,
    stock,
    image_url: b.image_url || null,
    is_featured: Boolean(b.is_featured),
    is_published: b.is_published !== false,
    occasion: Array.isArray(b.occasion) ? b.occasion : [],
    gift_for: Array.isArray(b.gift_for) ? b.gift_for : [],
    ...dimensions,
  };

  const { data, error } = await supabase.from('products').insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const locations = shippingLocations(b.product_shipping_locations, data.id);
  if (!locations) return NextResponse.json({ error: 'Shipping locations must contain valid states with text suburb and metro values.' }, { status: 400 });
  const { error: shippingError } = await supabase.from('product_shipping_locations').upsert(locations, { onConflict: 'product_id,state' });
  if (shippingError) return NextResponse.json({ error: shippingError.message }, { status: 400 });
  console.info('[Gallery] Product created:', data.id);
  return NextResponse.json(data);
}
