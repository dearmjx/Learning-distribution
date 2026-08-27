import { NextResponse } from "next/server";
import { DEMO_COOKIE_NAME } from "@/lib/demo-mode";

function logoutResponse(request: Request) {
  const response = NextResponse.redirect(new URL("/demo", request.url));
  response.cookies.set({
    name: DEMO_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export function GET(request: Request) {
  return logoutResponse(request);
}

export function POST(request: Request) {
  return logoutResponse(request);
}
