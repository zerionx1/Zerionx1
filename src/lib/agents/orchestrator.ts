import "server-only";
import { deterministicMarketScan } from "./deterministic-scanner";
import { callPowerX } from "./powerx-client";
import type { AgentStageResult, ZerionScanResult } from "./types";
import type { ZerionAgentId } from "./registry";

const orderedStages: ZerionAgentId[] = [
  "market-monitor",
  "research",
  "deep-analysis",
  "technical",
  "opportunity",
  "decision-support",
];

function deterministicStage(agent: ZerionAgentId, baseline: unknown) {
  if (agent === "market-monitor") {
    return {
      summary: "Provider-backed quote scan completed.",
      candidates: baseline,
    };
  }
  if (agent === "technical") {
    return {
      summary:
        "Deterministic momentum screening is active. Full indicator reasoning will be added by PowerX when available.",
      candidates: baseline,
    };
  }
  if (agent === "opportunity") {
    return {
      summary: "Candidates ranked by deterministic confidence.",
      candidates: baseline,
    };
  }
  if (agent === "decision-support") {
    return {
      summary:
        "Opportunities require explicit user approval before any execution handoff.",
      executionAllowed: false,
    };
  }
  return {
    summary: `${agent} is degraded until PowerX supplies this capability.`,
  };
}

export async function runZerionScan(
  symbols: string[],
): Promise<ZerionScanResult> {
  const baseline = await deterministicMarketScan(symbols);
  const stages: AgentStageResult[] = [];
  let powerXUsed = false;
  let context: unknown = { candidates: baseline };

  for (const agent of orderedStages) {
    const powerX = await callPowerX({
      agent,
      task:
        agent === "decision-support"
          ? "Create explainable decision support only. Never execute a trade and never bypass Zerion user approval or risk controls."
          : `Run the Zerion ${agent} stage. Return analysis only and never execute trades.`,
      context,
    });

    if (powerX) {
      powerXUsed = true;
      stages.push({ agent, mode: "powerx", output: powerX });
      context = { baseline, previous: powerX };
      continue;
    }

    const fallback = deterministicStage(agent, baseline);
    stages.push({
      agent,
      mode:
        agent === "research" || agent === "deep-analysis"
          ? "degraded"
          : "deterministic",
      output: fallback,
    });
    context = { baseline, previous: fallback };
  }

  return {
    mode: powerXUsed ? "powerx-assisted" : "deterministic-fallback",
    scannedAt: new Date().toISOString(),
    candidates: baseline,
    stages,
  };
}
