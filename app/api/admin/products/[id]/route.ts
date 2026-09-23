import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/admin';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission('products.update');
  if (access.response) return access.response;
  const { supabase } = access;

  const b = await req.json();
  const { id } = await params;
  const allowed = ['slug', 'name', 'description', 'meaning', 'price', 'category', 'stock', 'image_url', 'is_featured', 'is_published', 'occasion', 'gift_for'];
  const row: Record<string, any> = {};

  for (const k of allowed) {
    if (b[k] !== undefined) row[k] = ['price', 'stock'].includes(k) ? Number(b[k]) : b[k];
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

  const { data, error } = await supabase.from('products').update(row).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
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
