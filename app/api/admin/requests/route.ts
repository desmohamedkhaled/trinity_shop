import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/admin';

export async function GET() {
  const access = await requirePermission('requests.read');
  if (access.response) return access.response;
  const { supabase } = access;

  const { data, error } = await supabase
    .from('requests')
    .select('id,status,occasion,created_at,admin_notes,customers(id,name,phone,email),request_items(quantity,unit_price,products(name))')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
