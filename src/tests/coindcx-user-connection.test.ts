import { describe, expect, it } from "vitest";
import { normalizeCoinDcxUserCredentials } from "@/lib/brokers/coindcx-user-credentials";

describe("CoinDCX per-user credentials", () => {
  it("trims credentials", () => {
    expect(
      normalizeCoinDcxUserCredentials(
        " key ",
        " secret ",
      ),
    ).toEqual({
      apiKey: "key",
      apiSecret: "secret",
    });
  });

  it("rejects missing credentials", () => {
    expect(() =>
      normalizeCoinDcxUserCredentials("", ""),
    ).toThrow(/required/i);
  });
});
