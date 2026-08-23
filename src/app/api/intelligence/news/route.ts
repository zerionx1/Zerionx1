import { fail, ok } from "@/lib/security/api-response";

type NewsItem = {
  title: string;
  source: string;
  publishedAt: string;
  link: string;
  sentiment: "positive" | "negative" | "neutral";
  score: number;
};

const positive = [
  "surge",
  "gain",
  "beats",
  "growth",
  "upgrade",
  "record",
  "profit",
  "rally",
  "strong",
  "buy",
  "approval",
];
const negative = [
  "fall",
  "drop",
  "miss",
  "loss",
  "downgrade",
  "fraud",
  "probe",
  "weak",
  "selloff",
  "decline",
  "cuts",
];

function decodeXml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function tag(item: string, name: string) {
  const match = item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
  return decodeXml(
    String(match?.[1] ?? "")
      .replace("<![CDATA[", "")
      .replace("]]>", "")
      .trim(),
  );
}

function sentiment(title: string) {
  const text = title.toLowerCase();
  const pos = positive.filter((word) => text.includes(word)).length;
  const neg = negative.filter((word) => text.includes(word)).length;
  const score = pos - neg;
  return {
    sentiment:
      score > 0 ? ("positive" as const) : score < 0 ? ("negative" as const) : ("neutral" as const),
    score,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = (url.searchParams.get("symbol") ?? "NIFTY").trim().slice(0, 80);
  if (!symbol) return fail("INVALID_SYMBOL", "Symbol is required", 400);

  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(
    `${symbol} market OR stock OR trading`,
  )}&hl=en-IN&gl=IN&ceid=IN:en`;

  try {
    const response = await fetch(rssUrl, {
      cache: "no-store",
      headers: { "user-agent": "ZerionX1/1.0 market-intelligence" },
    });
    if (!response.ok) {
      return fail("NEWS_UPSTREAM_FAILED", "News source unavailable", 502);
    }

    const xml = await response.text();
    const entries = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)]
      .slice(0, 12)
      .map((match): NewsItem => {
        const raw = match[1] ?? "";
        const title = tag(raw, "title");
        const publishedAt = tag(raw, "pubDate");
        const link = tag(raw, "link");
        const source = tag(raw, "source") || "News";
        const scored = sentiment(title);
        return { title, source, publishedAt, link, ...scored };
      })
      .filter((item) => Boolean(item.title));

    const aggregate = entries.reduce((sum, item) => sum + item.score, 0);

    return ok({
      symbol,
      fetchedAt: new Date().toISOString(),
      aggregateSentiment:
        aggregate > 1 ? "positive" : aggregate < -1 ? "negative" : "neutral",
      items: entries,
      methodology:
        "Headline keyword sentiment only; not an execution signal.",
    });
  } catch (error) {
    return fail(
      "NEWS_ANALYSIS_FAILED",
      error instanceof Error ? error.message : "News analysis failed",
      500,
    );
  }
}
