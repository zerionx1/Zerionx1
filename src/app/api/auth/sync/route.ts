import { NextResponse } from "next/server";
import { authCookieName, verifySupabaseToken } from "@/lib/supabase/server-auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { accessToken?: unknown } | null;
  const accessToken = typeof body?.accessToken === "string" ? body.accessToken : "";
  if (!accessToken) return NextResponse.json({ error: "Missing access token" }, { status: 400 });
  const session = await verifySupabaseToken(accessToken);
  if (!session) return NextResponse.json({ error: "Invalid Supabase session" }, { status: 401 });
  const response = NextResponse.json({ authenticated: true, user: session.user });
  response.cookies.set(authCookieName, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(authCookieName, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
