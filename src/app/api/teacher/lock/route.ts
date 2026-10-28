import { NextResponse } from "next/server";
import { TEACHER_COOKIE_NAME } from "@/lib/teacher-gate";

/** Signs the teacher out of the dashboard on this device and returns to the student page. */
export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set({ name: TEACHER_COOKIE_NAME, value: "", path: "/", maxAge: 0 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
