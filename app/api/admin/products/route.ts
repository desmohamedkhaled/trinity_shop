import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/admin';

export async function GET() {
  const access = await requirePermission('products.read');
  if (access.response) return access.response;
  const { supabase } = access;

  const { data, error } = await supabase.from('products').select('*, product_images(id, product_id, image_url, alt_text, sort_order)').order('created_at', { ascending: false });
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
  if (typeof b.name !== 'string' || !b.name.trim() || typeof b.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(b.slug)) {
    return NextResponse.json({ error: 'Name and a valid lowercase slug are required.' }, { status: 400 });
  }
  if (!Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
    return NextResponse.json({ error: 'Price and stock must be valid non-negative numbers.' }, { status: 400 });
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
  };

  const { data, error } = await supabase.from('products').insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  console.info('[Gallery] Product created:', data.id);
  return NextResponse.json(data);
}
