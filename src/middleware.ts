import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";
import {
  DEMO_COOKIE_NAME,
  isDemoModeEnabled,
  verifyDemoSessionToken,
} from "@/lib/demo-mode";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const persistenceIsSupabase = process.env.LEARNING_PERSISTENCE?.toLowerCase() === "supabase";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (persistenceIsSupabase && supabaseUrl && supabaseKey) {
    const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          }
        },
      },
    });
    // Refresh/validate the session without turning middleware into an
    // authorization layer. Route handlers still resolve membership and role.
    await supabase.auth.getUser();
  }

  if (!isDemoModeEnabled()) return response;

  const { pathname } = request.nextUrl;
  const isPublicPath =
    pathname === "/demo" ||
    pathname.startsWith("/api/demo/") ||
    pathname === "/api/health" ||
    pathname === "/api/ready" ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico";

  if (isPublicPath) return response;

  const token = request.cookies.get(DEMO_COOKIE_NAME)?.value;
  if (await verifyDemoSessionToken(token)) return response;

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Demo mode login required" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/demo";
  loginUrl.search = "";
  loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
