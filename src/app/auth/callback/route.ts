import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";
  if (!code) return NextResponse.redirect(new URL("/?auth=missing_code", url));

  const client = await getSupabaseServerClient();
  if (!client) return NextResponse.redirect(new URL("/?auth=supabase_unconfigured", url));
  const { error } = await client.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/?auth=callback_failed", url));
  return NextResponse.redirect(new URL(next.startsWith("/") ? next : "/", url));
}
