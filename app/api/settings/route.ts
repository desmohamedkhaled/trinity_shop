import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/admin';

const allowedKeys = new Set([
  'hero_title',
  'hero_subtitle',
  'whatsapp_checkout_enabled',
  'whatsapp_number',
  'phone_number',
  'store_name',
]);

export async function GET() {
  const access = await requirePermission('settings.read');
  if (access.response) return access.response;
  const { supabase, user } = access;

  const { data, error } = await supabase.from('site_settings').select('key,value');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    Object.fromEntries(
      (data ?? []).map((x) => {
        let v: any = x.value;
        try {
          v = JSON.parse(x.value);
        } catch {
          // ignore
        }
        return [x.key, v];
      })
    )
  );
}

export async function PATCH(req: Request) {
  const access = await requirePermission('settings.update');
  if (access.response) return access.response;
  const { supabase, user } = access;

  const body = (await req.json()) as Record<string, unknown>;

  const entries = Object.entries(body).filter(([key]) => allowedKeys.has(key));
  if (!entries.length || entries.length !== Object.keys(body).length) {
    return NextResponse.json({ error: 'One or more settings are not allowed.' }, { status: 400 });
  }

  for (const [key, value] of entries) {
    if (key === 'hero_title' || key === 'hero_subtitle' || key === 'store_name') {
      if (typeof value !== 'string' || value.trim().length > 500) {
        return NextResponse.json({ error: `${key} must be a short text value.` }, { status: 400 });
      }
    }
    if (key === 'whatsapp_number' && (typeof value !== 'string' || value.length > 32 || !/^\d*$/.test(value))) {
      return NextResponse.json({ error: 'WhatsApp number must contain digits only.' }, { status: 400 });
    }
    if (key === 'phone_number' && (typeof value !== 'string' || value.length > 64 || !/^[0-9+()\-\s]*$/.test(value))) {
      return NextResponse.json({ error: 'Phone number may contain digits, spaces, +, -, and parentheses only.' }, { status: 400 });
    }
    if (key === 'whatsapp_checkout_enabled' && typeof value !== 'boolean') {
      return NextResponse.json({ error: 'WhatsApp checkout setting must be boolean.' }, { status: 400 });
    }
    const { error } = await supabase.from('site_settings').upsert(
      { key, value: JSON.stringify(value), updated_by: user.id },
      { onConflict: 'key' }
    );

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
