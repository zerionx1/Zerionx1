import { describe, expect, it } from "vitest";
import { CircuitBreaker } from "@/lib/resilience/circuit-breaker";

describe("CircuitBreaker", () => {
  it("opens after reaching the failure threshold", () => {
    const breaker = new CircuitBreaker(2, 1_000);
    const now = 10_000;

    breaker.recordFailure(now);
    breaker.recordFailure(now);

    expect(breaker.snapshot(now).open).toBe(true);
  });

  it("allows execution again after the reset interval", () => {
    const breaker = new CircuitBreaker(2, 1_000);
    const openedAt = 10_000;

    breaker.recordFailure(openedAt);
    breaker.recordFailure(openedAt);

    expect(breaker.snapshot(openedAt + 999).open).toBe(true);
    expect(breaker.snapshot(openedAt + 1_000).open).toBe(false);
  });

  it("closes after a successful execution", () => {
    const breaker = new CircuitBreaker(1, 1_000);
    const now = 10_000;

    breaker.recordFailure(now);
    breaker.recordSuccess();

    expect(breaker.snapshot(now).open).toBe(false);
    expect(breaker.snapshot(now).failures).toBe(0);
  });
});
