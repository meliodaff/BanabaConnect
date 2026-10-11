import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase for Server Components and Server Actions, acting as the signed-in staff member, so
 * row-level security applies. Create a new one for every request; never share it.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components can't set cookies. proxy.ts refreshes the session instead.
          }
        },
      },
    },
  );
}
