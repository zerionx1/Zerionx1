import { NextResponse } from "next/server";
export function GET() { return NextResponse.json({ status: "alive", at: new Date().toISOString() }); }
