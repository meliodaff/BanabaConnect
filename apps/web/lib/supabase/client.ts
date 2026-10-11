import { createBrowserClient } from "@supabase/ssr";

/** Supabase in the browser (live updates). Reads the session from the auth cookies. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
