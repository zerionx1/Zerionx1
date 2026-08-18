import type { ZerionAgentId } from "./registry";
import type { ScanOpportunity } from "./deterministic-scanner";

export type AgentStageResult = {
  agent: ZerionAgentId;
  mode: "powerx" | "deterministic" | "degraded";
  output: unknown;
};

export type ZerionScanResult = {
  mode: "powerx-assisted" | "deterministic-fallback";
  scannedAt: string;
  candidates: ScanOpportunity[];
  stages: AgentStageResult[];
};
