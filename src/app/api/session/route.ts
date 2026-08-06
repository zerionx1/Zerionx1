import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/supabase/server-auth";

export async function GET() {
  const session = await getServerSession();
  return session
    ? NextResponse.json({ authenticated: true, user: session.user, liveExecutionAllowed: false })
    : NextResponse.json({ authenticated: false, liveExecutionAllowed: false }, { status: 401 });
}
