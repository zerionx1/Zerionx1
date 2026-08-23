import { fail, ok } from "@/lib/security/api-response";

function yahooSymbol(symbol: string, exchange?: string) {
  const s = symbol
    .trim()
    .toUpperCase()
    .replaceAll(" ", "")
    .replaceAll("/", "-");

  if (
    s.includes("-USD") ||
    s.endsWith("=X") ||
    s.startsWith("^") ||
    s.endsWith(".NS") ||
    s.endsWith(".BO")
  ) {
    return s;
  }

  if (exchange?.toUpperCase().includes("BSE")) return `${s}.BO`;
  if (
    exchange?.toUpperCase().includes("NSE") ||
    !s.includes("-")
  ) {
    return `${s}.NS`;
  }

  return s;
}

function finite(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = (url.searchParams.get("symbol") ?? "").trim();
  const exchange = (url.searchParams.get("exchange") ?? "").trim();

  if (!symbol) {
    return fail("SYMBOL_REQUIRED", "symbol is required", 400);
  }

  const ticker = yahooSymbol(symbol, exchange);
  const endpoint =
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(ticker)}`;

  try {
    const response = await fetch(endpoint, {
      cache: "no-store",
      headers: {
        "user-agent":
          "Mozilla/5.0 ZerionX1 Market Intelligence",
        accept: "application/json",
      },
    });

    if (!response.ok) {
      return fail(
        "FUNDAMENTALS_UPSTREAM_FAILED",
        `Fundamentals provider returned ${response.status}`,
        502,
      );
    }

    const body = (await response.json()) as {
      quoteResponse?: { result?: Array<Record<string, unknown>> };
    };
    const row = body.quoteResponse?.result?.[0];

    if (!row) {
      return fail(
        "FUNDAMENTALS_NOT_FOUND",
        `No public fundamentals found for ${ticker}`,
        404,
      );
    }

    return ok({
      symbol,
      providerSymbol: ticker,
      companyName: String(
        row.longName ?? row.shortName ?? symbol,
      ),
      currency: String(row.currency ?? ""),
      marketCap: finite(row.marketCap),
      trailingPE: finite(row.trailingPE),
      forwardPE: finite(row.forwardPE),
      epsTrailingTwelveMonths: finite(row.epsTrailingTwelveMonths),
      epsForward: finite(row.epsForward),
      bookValue: finite(row.bookValue),
      priceToBook: finite(row.priceToBook),
      dividendYield: finite(row.dividendYield),
      fiftyTwoWeekHigh: finite(row.fiftyTwoWeekHigh),
      fiftyTwoWeekLow: finite(row.fiftyTwoWeekLow),
      averageDailyVolume3Month: finite(row.averageDailyVolume3Month),
      regularMarketPrice: finite(row.regularMarketPrice),
      regularMarketChangePercent: finite(row.regularMarketChangePercent),
      source: "yahoo-finance-public-quote",
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return fail(
      "FUNDAMENTALS_ANALYSIS_FAILED",
      error instanceof Error ? error.message : "Fundamentals analysis failed",
      500,
    );
  }
}
