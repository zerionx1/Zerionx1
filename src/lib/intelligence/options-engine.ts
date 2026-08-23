import "server-only";

export type OptionGreekSet = {
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  iv: number | null;
};

export type OptionSideSnapshot = {
  instrumentKey: string;
  ltp: number | null;
  oi: number;
  volume: number;
  bid: number | null;
  ask: number | null;
  greeks: OptionGreekSet;
};

export type OptionStrikeSnapshot = {
  expiry: string;
  strike: number;
  underlyingPrice: number | null;
  call: OptionSideSnapshot | null;
  put: OptionSideSnapshot | null;
};

function num(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function positive(value: unknown) {
  return Math.max(0, num(value) ?? 0);
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function side(value: unknown): OptionSideSnapshot | null {
  const row = record(value);
  if (!Object.keys(row).length) return null;

  const market = record(row.market_data);
  const greeks = record(row.option_greeks);

  return {
    instrumentKey: String(
      row.instrument_key ??
        market.instrument_key ??
        row.instrument_token ??
        "",
    ),
    ltp: num(
      market.ltp ??
        market.last_price ??
        row.ltp ??
        row.last_price,
    ),
    oi: positive(market.oi ?? row.oi),
    volume: positive(
      market.volume ?? market.volume_traded ?? row.volume,
    ),
    bid: num(
      market.bid_price ??
        market.best_bid_price ??
        row.bid_price,
    ),
    ask: num(
      market.ask_price ??
        market.best_ask_price ??
        row.ask_price,
    ),
    greeks: {
      delta: num(greeks.delta),
      gamma: num(greeks.gamma),
      theta: num(greeks.theta),
      vega: num(greeks.vega),
      iv: num(
        greeks.iv ??
          greeks.implied_volatility ??
          market.iv ??
          row.iv,
      ),
    },
  };
}

export function normalizeOptionChain(payload: unknown): OptionStrikeSnapshot[] {
  const root = record(payload);
  const data = Array.isArray(root.data)
    ? root.data
    : Array.isArray(payload)
      ? payload
      : [];

  return data
    .map((value): OptionStrikeSnapshot | null => {
      const row = record(value);
      const strike = num(row.strike_price ?? row.strike);
      if (strike === null) return null;

      return {
        expiry: String(row.expiry ?? row.expiry_date ?? ""),
        strike,
        underlyingPrice: num(
          row.underlying_spot_price ??
            row.underlying_price ??
            row.spot_price,
        ),
        call: side(
          row.call_options ??
            row.call ??
            row.ce,
        ),
        put: side(
          row.put_options ??
            row.put ??
            row.pe,
        ),
      };
    })
    .filter(
      (value): value is OptionStrikeSnapshot => Boolean(value),
    )
    .sort((a, b) => a.strike - b.strike);
}

export function nearestAtm(
  rows: OptionStrikeSnapshot[],
): OptionStrikeSnapshot | null {
  if (!rows.length) return null;
  const spot =
    rows.find((row) => row.underlyingPrice !== null)?.underlyingPrice ??
    rows[Math.floor(rows.length / 2)]?.strike ??
    0;

  return rows.reduce((best, row) =>
    Math.abs(row.strike - spot) < Math.abs(best.strike - spot)
      ? row
      : best,
  );
}

export function optionMetrics(rows: OptionStrikeSnapshot[]) {
  const callOi = rows.reduce(
    (sum, row) => sum + (row.call?.oi ?? 0),
    0,
  );
  const putOi = rows.reduce(
    (sum, row) => sum + (row.put?.oi ?? 0),
    0,
  );
  const pcr = callOi > 0 ? putOi / callOi : null;

  // Approximate max-pain: expiration value paid to all open call/put holders.
  const pains = rows.map((candidate) => {
    const settlement = candidate.strike;
    let pain = 0;

    for (const row of rows) {
      pain += Math.max(0, settlement - row.strike) * (row.call?.oi ?? 0);
      pain += Math.max(0, row.strike - settlement) * (row.put?.oi ?? 0);
    }

    return { strike: candidate.strike, pain };
  });

  const maxPain = pains.length
    ? pains.reduce((a, b) => (b.pain < a.pain ? b : a)).strike
    : null;

  return {
    totalCallOi: callOi,
    totalPutOi: putOi,
    pcr: pcr === null ? null : Number(pcr.toFixed(3)),
    maxPain,
  };
}

export type PayoffPoint = {
  spot: number;
  longCall: number | null;
  longPut: number | null;
  longStraddle: number | null;
};

export function payoffScenarios(
  atm: OptionStrikeSnapshot | null,
): PayoffPoint[] {
  if (!atm) return [];

  const callPremium = atm.call?.ltp ?? null;
  const putPremium = atm.put?.ltp ?? null;
  const base =
    atm.underlyingPrice ??
    atm.strike;

  return [-0.06, -0.03, 0, 0.03, 0.06].map((move) => {
    const spot = base * (1 + move);
    const longCall =
      callPremium === null
        ? null
        : Math.max(0, spot - atm.strike) - callPremium;
    const longPut =
      putPremium === null
        ? null
        : Math.max(0, atm.strike - spot) - putPremium;

    return {
      spot: Number(spot.toFixed(2)),
      longCall:
        longCall === null ? null : Number(longCall.toFixed(2)),
      longPut:
        longPut === null ? null : Number(longPut.toFixed(2)),
      longStraddle:
        longCall === null || longPut === null
          ? null
          : Number((longCall + longPut).toFixed(2)),
    };
  });
}
