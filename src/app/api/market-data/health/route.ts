import { NextResponse } from "next/server";

export async function GET() {
  const base =
    process.env.ZERION_MARKET_DATA_BASE_URL ??
    "https://zerionx1.onrender.com";

  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/health`, {
      cache: "no-store",
    });
    const worker = await response.json().catch(() => null);
    const providerState = worker?.providers ?? {};

    return NextResponse.json({
      status: response.ok && worker?.ok ? "live" : "degraded",
      providers: [
        {
          provider: "upstox",
          state:
            (providerState.upstox?.activeSockets ?? 0) > 0
              ? "connected"
              : "degraded",
          ...(providerState.upstox ?? {}),
        },
        {
          provider: "coindcx",
          state:
            (providerState.coindcx?.activeSockets ?? 0) > 0
              ? "connected"
              : "degraded",
          ...(providerState.coindcx ?? {}),
        },
      ],
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unavailable",
        providers: [],
        error:
          error instanceof Error ? error.message : "Realtime worker unavailable",
        checkedAt: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
