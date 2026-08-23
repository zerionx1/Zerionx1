import { upstoxClient } from "@/lib/brokers/upstox-client";
import {
  nearestAtm,
  normalizeOptionChain,
  optionMetrics,
  payoffScenarios,
} from "@/lib/intelligence/options-engine";
import { fail, ok } from "@/lib/security/api-response";

function findExpiries(payload: unknown) {
  const root =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  const data = Array.isArray(root.data) ? root.data : [];
  return [
    ...new Set(
      data
        .map((row) =>
          row && typeof row === "object"
            ? String(
                (row as Record<string, unknown>).expiry ??
                  (row as Record<string, unknown>).expiry_date ??
                  "",
              )
            : "",
        )
        .filter(Boolean),
    ),
  ].sort();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const instrumentKey = (url.searchParams.get("instrumentKey") ?? "").trim();
  let expiry = (url.searchParams.get("expiry") ?? "").trim();

  if (!instrumentKey) {
    return fail(
      "INSTRUMENT_REQUIRED",
      "instrumentKey is required for options analysis",
      400,
    );
  }

  try {
    if (!expiry) {
      const contracts = await upstoxClient.optionContracts(instrumentKey);
      const expiries = findExpiries(contracts);
      expiry = expiries[0] ?? "";
    }

    if (!expiry) {
      return fail(
        "NO_OPTIONS",
        "No option expiry is available for this instrument",
        404,
      );
    }

    const rawChain = await upstoxClient.optionChain(instrumentKey, expiry);
    const chain = normalizeOptionChain(rawChain);
    if (!chain.length) {
      return fail(
        "EMPTY_OPTION_CHAIN",
        "Upstox returned no option-chain rows",
        404,
      );
    }

    const atm = nearestAtm(chain);
    const metrics = optionMetrics(chain);

    return ok({
      instrumentKey,
      expiry,
      underlyingPrice: atm?.underlyingPrice ?? null,
      atm,
      metrics,
      payoff: payoffScenarios(atm),
      strikes: chain.slice(
        Math.max(
          0,
          atm ? chain.findIndex((row) => row.strike === atm.strike) - 8 : 0,
        ),
        atm
          ? chain.findIndex((row) => row.strike === atm.strike) + 9
          : 17,
      ),
      source: "upstox-option-chain",
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return fail(
      "OPTIONS_ANALYSIS_FAILED",
      error instanceof Error ? error.message : "Options analysis failed",
      502,
    );
  }
}
