import { browserSupabase } from "@/lib/supabase";
export function createSupabaseBrowserClient() {
  return browserSupabase();
}
