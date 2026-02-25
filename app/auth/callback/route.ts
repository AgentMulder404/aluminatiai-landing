import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              try {
                cookieStore.set(name, value, options);
              } catch {
                // read-only in some contexts — safe to ignore
              }
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Smart redirect: check if the user already has jobs (returning) or not (new)
      const { data: jobs } = await supabase
        .from("gpu_jobs")
        .select("id")
        .limit(1);

      const destination =
        (jobs?.length ?? 0) > 0 ? "/dashboard" : "/dashboard/setup";
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  // Fallback: send to login with an error hint
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
