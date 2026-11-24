import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/admin';
import { homepageContentKeys } from '@/lib/homepage-content';

const allowedKeys = new Set([
  'hero_title',
  'hero_subtitle',
  'whatsapp_checkout_enabled',
  'whatsapp_number',
  'phone_number',
  'store_name',
  'shipping_origin',
  ...homepageContentKeys,
]);
const textSettingKeys = new Set([
  'hero_title',
  'hero_subtitle',
  'store_name',
  ...homepageContentKeys,
]);

export async function GET() {
  const access = await requirePermission('settings.read');
  if (access.response) return access.response;
  const { supabase, user } = access;

  const { data, error } = await supabase.from('site_settings').select('key,value');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const settings = Object.fromEntries(
      (data ?? []).map((x) => {
        let v: any = x.value;
        try {
          v = JSON.parse(x.value);
        } catch {
          // ignore
        }
        return [x.key, v];
      })
  );
  if (!settings.shipping_origin && process.env.EFLOW_FROM_POSTCODE) {
    settings.shipping_origin_postcode = process.env.EFLOW_FROM_POSTCODE;
  }
  return NextResponse.json(settings);
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
    if (textSettingKeys.has(key)) {
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
    if (key === 'shipping_origin') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return NextResponse.json({ error: 'Shipping origin must be an address object.' }, { status: 400 });
      }
      const origin = value as Record<string, unknown>;
      if (
        typeof origin.address !== 'string' || origin.address.length > 200 ||
        typeof origin.suburb !== 'string' || origin.suburb.length > 100 ||
        typeof origin.state !== 'string' || origin.state.length > 50 ||
        typeof origin.postcode !== 'string' || !/^\d{4}$/.test(origin.postcode)
      ) {
        return NextResponse.json({ error: 'Enter a valid shipping origin address and 4-digit postcode.' }, { status: 400 });
      }
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

  if (entries.some(([key]) => homepageContentKeys.some((contentKey) => contentKey === key))) {
    revalidatePath('/');
  }

  return NextResponse.json({ ok: true });
}
