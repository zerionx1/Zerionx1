export type DependencyState = "healthy" | "degraded" | "unavailable";
export interface DependencyHealth { name: string; state: DependencyState; latencyMs?: number; detail?: string }
export interface PlatformHealth { status: DependencyState; checkedAt: string; dependencies: DependencyHealth[] }
export function aggregateHealth(items: DependencyHealth[]): PlatformHealth {
  const status = items.some((x) => x.state === "unavailable") ? "unavailable" : items.some((x) => x.state === "degraded") ? "degraded" : "healthy";
  return { status, checkedAt: new Date().toISOString(), dependencies: items };
}

export interface FoundationHealthCheck {
  name: string;
  status: DependencyState;
  latencyMs: number;
  detail?: string;
}

export async function getFoundationHealth(): Promise<FoundationHealthCheck[]> {
  const startedAt = performance.now();
  return [
    {
      name: "web",
      status: "healthy",
      latencyMs: Math.max(0, Math.round(performance.now() - startedAt)),
      detail: "Next.js application process is responding.",
    },
    {
      name: "database",
      status: process.env.DATABASE_URL ? "degraded" : "unavailable",
      latencyMs: 0,
      detail: process.env.DATABASE_URL
        ? "Configured but requires runtime connectivity verification."
        : "DATABASE_URL is not configured.",
    },
    {
      name: "execution",
      status: process.env.EXECUTION_LIVE_ENABLED === "true" ? "degraded" : "healthy",
      latencyMs: 0,
      detail: process.env.EXECUTION_LIVE_ENABLED === "true"
        ? "Live execution requested; worker and broker checks are still required."
        : "Live execution is safely disabled.",
    },
  ];
}
