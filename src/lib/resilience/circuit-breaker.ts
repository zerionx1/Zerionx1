export class CircuitBreaker {
  private failures = 0;
  private openedAt?: number;

  constructor(
    private readonly threshold = 5,
    private readonly resetAfterMs = 30_000,
  ) {}

  canExecute(now = Date.now()): boolean {
    return (
      this.openedAt === undefined ||
      now - this.openedAt >= this.resetAfterMs
    );
  }

  recordSuccess(): void {
    this.failures = 0;
    this.openedAt = undefined;
  }

  recordFailure(now = Date.now()): void {
    this.failures += 1;

    if (this.failures >= this.threshold && this.openedAt === undefined) {
      this.openedAt = now;
    }
  }

  snapshot(now = Date.now()) {
    return {
      failures: this.failures,
      open: !this.canExecute(now),
      openedAt: this.openedAt,
    };
  }
}
