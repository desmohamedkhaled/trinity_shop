import { NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/supabase';

export async function POST() {
  const supabase = await serverSupabase();

  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Supabase is not configured.' }, { status: 503 });
  }

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
