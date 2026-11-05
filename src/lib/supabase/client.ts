import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/database.types";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // Return empty mock client or let repository fallback to local mock mode
    return null;
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseKey);
}
