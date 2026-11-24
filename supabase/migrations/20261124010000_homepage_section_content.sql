drop policy if exists "public can read checkout settings" on public.site_settings;
drop policy if exists "public can read storefront settings" on public.site_settings;

create policy "public can read storefront settings"
on public.site_settings
for select
using (
  key in (
    'whatsapp_checkout_enabled',
    'whatsapp_number',
    'phone_number',
    'store_name',
    'hero_title',
    'hero_subtitle',
    'trinity_story_eyebrow',
    'trinity_story_title',
    'trinity_story_emphasis',
    'trinity_story_text',
    'trinity_story_link',
    'gift_finder_eyebrow',
    'gift_finder_title',
    'gift_finder_text',
    'gift_finder_button',
    'final_cta_eyebrow',
    'final_cta_title',
    'final_cta_text',
    'final_cta_button'
  )
);
