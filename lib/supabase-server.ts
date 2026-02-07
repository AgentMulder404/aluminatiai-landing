// Server-only Supabase client that reads session cookies.
// Separated from supabase-client.ts to avoid pulling next/headers into client bundles.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Cookie-aware Supabase client for API routes and server components.
 * Uses the anon key and reads session cookies so getUser() works.
 */
export async function createSupabaseCookieClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // setAll can fail in Server Components (read-only).
            // This is fine — the cookie was already sent with the request.
          }
        }
      },
    },
  });
}
