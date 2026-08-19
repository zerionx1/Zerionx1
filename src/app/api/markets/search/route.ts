import { NextRequest } from "next/server";

import { getCoinDcxMarketDetails } from "@/lib/brokers/coindcx-core";
import { upstoxClient } from "@/lib/brokers/upstox-client";
import { searchMarketCatalog } from "@/lib/market/market-catalog";
import { ok } from "@/lib/security/api-response";
import type { MarketInstrument, MarketKind } from "@/types/market";

type UpstoxSearchRow = {
  name?: string;
  short_name?: string;
  trading_symbol?: string;
  instrument_key?: string;
  exchange?: string;
  segment?: string;
  instrument_type?: string;
  lot_size?: number;
  tick_size?: number;
  expiry?: string;
  strike_price?: number;
};

function upstoxKind(row: UpstoxSearchRow): MarketKind {
  const segment = String(row.segment ?? "");
  const type = String(row.instrument_type ?? "").toUpperCase();
  if (segment.includes("INDEX")) return "indian-index";
  if (segment.includes("FO") && (type === "CE" || type === "PE"))
    return "indian-options";
  if (segment.includes("FO") || type === "FUT") return "indian-futures";
  if (segment.includes("MCX")) return "commodity";
  return "indian-equity";
}

function mapUpstox(row: UpstoxSearchRow): MarketInstrument | null {
  const key = String(row.instrument_key ?? "");
  const symbol = String(row.trading_symbol ?? row.short_name ?? row.name ?? "");
  if (!key || !symbol) return null;

  return {
    id: `upstox:${key}`,
    symbol,
    displayName: String(row.short_name ?? row.name ?? symbol),
    market: upstoxKind(row),
    exchange: String(row.exchange ?? "NSE"),
    currency: "INR",
    tickSize: Number(row.tick_size ?? 0.05),
    lotSize: Number(row.lot_size ?? 1),
    enabled: true,
    providerRequired: true,
    searchableText: [
      row.name,
      row.short_name,
      row.trading_symbol,
      row.expiry,
      row.strike_price,
      row.instrument_type,
    ]
      .filter(Boolean)
      .join(" "),
  };
}

function dedupe(items: MarketInstrument[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.id}|${item.symbol}`.toUpperCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function searchUpstox(query: string, market?: MarketKind) {
  if (!query.trim()) return [];

  let filters = "page_number=1&records=30";
  if (market === "indian-equity") filters += "&exchanges=NSE,BSE&segments=EQ";
  if (market === "indian-index") filters += "&exchanges=NSE,BSE&segments=INDEX";
  if (market === "indian-futures")
    filters += "&exchanges=NSE,BSE&segments=FO&instrument_types=FUT";
  if (market === "indian-options")
    filters += "&exchanges=NSE,BSE&segments=FO&instrument_types=CE,PE";
  if (market === "commodity") filters += "&exchanges=MCX&segments=COMM";

  try {
    const result = (await upstoxClient.instrumentSearch(query, filters)) as {
      data?: UpstoxSearchRow[];
    };
    return (result.data ?? [])
      .map(mapUpstox)
      .filter((value): value is MarketInstrument => Boolean(value));
  } catch {
    return [];
  }
}

async function searchCoinDcx(query: string) {
  if (!query.trim()) return [];
  try {
    const rows = await getCoinDcxMarketDetails();
    const needle = query
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");

    const results: MarketInstrument[] = [];

    for (const row of rows) {
      const providerName = String(row.coindcx_name ?? "");
      const base = String(row.base_currency_short_name ?? "");
      const target = String(row.target_currency_short_name ?? "");
      const pair = String(row.pair ?? "");
      const symbol =
        base && target
          ? `${base}/${target}`
          : providerName.includes("_")
            ? providerName.replace("_", "/")
            : providerName;

      const haystack = `${providerName} ${base} ${target} ${pair} ${symbol}`
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");

      if (!haystack.includes(needle) || !symbol) continue;

      results.push({
        id: `coindcx:${pair || providerName}`,
        symbol,
        displayName: symbol,
        market: "crypto",
        exchange: "COINDCX",
        currency: target || "USDT",
        tickSize: 0.00000001,
        lotSize: 0.00000001,
        enabled: true,
        providerRequired: true,
      });
    }

    return results.slice(0, 30);
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const market = request.nextUrl.searchParams.get(
    "market",
  ) as MarketKind | null;

  const local = searchMarketCatalog(query, market ?? undefined);

  if (!query.trim()) return ok(local.slice(0, 30));

  const provider =
    market === "crypto"
      ? await searchCoinDcx(query)
      : market && !market.startsWith("indian-") && market !== "commodity"
        ? []
        : await searchUpstox(query, market ?? undefined);

  return ok(dedupe([...provider, ...local]).slice(0, 30));
}
