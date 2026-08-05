import { NextResponse } from "next/server";
import { aggregateHealth } from "@/lib/observability/health";
export function GET() {
  const health = aggregateHealth([{ name: "web", state: "healthy" }, { name: "live-execution", state: "degraded", detail: "disabled by default until verified providers are configured" }]);
  return NextResponse.json(health, { status: health.status === "unavailable" ? 503 : 200 });
}
