const GOCHARTING_SDK_URL = "https://gocharting.com/sdk/library/index.umd.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const upstream = await fetch(GOCHARTING_SDK_URL, {
      cache: "no-store",
      headers: {
        Accept: "application/javascript,text/javascript,*/*;q=0.8",
        "User-Agent": "ZerionX1-GoCharting-Proxy/1.0",
      },
    });

    if (!upstream.ok) {
      return new Response(
        `Official GoCharting SDK upstream returned HTTP ${upstream.status}`,
        {
          status: 502,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const body = await upstream.arrayBuffer();
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "X-GoCharting-Upstream": "official-umd",
      },
    });
  } catch (error) {
    return new Response(
      `Official GoCharting SDK fetch failed: ${
        error instanceof Error ? error.message : "unknown upstream error"
      }`,
      {
        status: 502,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
