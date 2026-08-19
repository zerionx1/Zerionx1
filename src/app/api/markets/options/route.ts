import { upstoxClient } from "@/lib/brokers/upstox-client";
import { fail, ok } from "@/lib/security/api-response";

type Contract = {
  name?: string;
  segment?: string;
  exchange?: string;
  expiry?: string;
  instrument_key?: string;
  trading_symbol?: string;
  tick_size?: number;
  lot_size?: number;
  instrument_type?: "CE" | "PE";
  underlying_key?: string;
  underlying_symbol?: string;
  strike_price?: number;
  weekly?: boolean;
};

type ChainRow = {
  expiry_date?: string;
  strike_price?: number;
  underlying_key?: string;
  underlying_spot_price?: number;
  call_options?: {
    instrument_key?: string;
    market_data?: Record<string, unknown>;
    option_greeks?: Record<string, unknown>;
  };
  put_options?: {
    instrument_key?: string;
    market_data?: Record<string, unknown>;
    option_greeks?: Record<string, unknown>;
  };
};

const aliases: Record<string, string> = {
  NIFTY: "NSE_INDEX|Nifty 50",
  "NIFTY 50": "NSE_INDEX|Nifty 50",
  NIFTY50: "NSE_INDEX|Nifty 50",
  BANKNIFTY: "NSE_INDEX|Nifty Bank",
  "BANK NIFTY": "NSE_INDEX|Nifty Bank",
  "NIFTY BANK": "NSE_INDEX|Nifty Bank",
};

function underlying(value: string) {
  const trimmed = value.trim();
  if (trimmed.includes("|")) return trimmed;
  return aliases[trimmed.toUpperCase()] ?? trimmed;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requested = url.searchParams.get("underlying") ?? "NIFTY 50";
  const expiry = url.searchParams.get("expiry") ?? "";
  const instrumentKey = underlying(requested);

  try {
    const contractsPayload = (await upstoxClient.optionContracts(
      instrumentKey,
      expiry || undefined,
    )) as { data?: Contract[] };

    const contracts = (contractsPayload.data ?? [])
      .filter((row) => row.instrument_key && row.trading_symbol)
      .map((row) => ({
        id: `upstox:${row.instrument_key}`,
        instrumentKey: row.instrument_key,
        symbol: row.trading_symbol,
        name: row.name ?? row.underlying_symbol ?? row.trading_symbol,
        exchange: row.exchange ?? "NSE",
        segment: row.segment ?? "NSE_FO",
        expiry: row.expiry ?? "",
        strike: Number(row.strike_price ?? 0),
        type: row.instrument_type ?? "",
        lotSize: Number(row.lot_size ?? 1),
        tickSize: Number(row.tick_size ?? 0.05),
        weekly: Boolean(row.weekly),
      }));

    const expiries = Array.from(
      new Set(contracts.map((row) => row.expiry).filter(Boolean)),
    ).sort();

    let chain: ChainRow[] = [];
    const selectedExpiry = expiry || expiries[0] || "";
    if (selectedExpiry) {
      const chainPayload = (await upstoxClient.optionChain(
        instrumentKey,
        selectedExpiry,
      )) as { data?: ChainRow[] };
      chain = chainPayload.data ?? [];
    }

    return ok({
      underlying: instrumentKey,
      requested,
      expiry: selectedExpiry,
      expiries,
      contracts,
      chain,
    });
  } catch (error) {
    return fail(
      "OPTION_CHAIN_PROVIDER_ERROR",
      error instanceof Error
        ? error.message
        : "Unable to load Upstox option chain",
      502,
    );
  }
}
