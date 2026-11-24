import { createClient } from "@supabase/supabase-js";
import {
  homepageContentDefaults,
  homepageContentKeys,
  type HomepageContent,
} from "@/lib/homepage-content";

export async function getHomepageContent(): Promise<HomepageContent> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return homepageContentDefaults;

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("site_settings")
    .select("key,value")
    .in("key", [...homepageContentKeys]);

  if (error) {
    console.error("Failed to load homepage content:", error);
    return homepageContentDefaults;
  }

  const content = { ...homepageContentDefaults };
  for (const row of data ?? []) {
    if (!homepageContentKeys.includes(row.key as (typeof homepageContentKeys)[number])) continue;
    try {
      const value: unknown = JSON.parse(row.value);
      if (typeof value === "string") {
        content[row.key as (typeof homepageContentKeys)[number]] = value;
      }
    } catch {
      content[row.key as (typeof homepageContentKeys)[number]] = row.value;
    }
  }

  return content;
}
