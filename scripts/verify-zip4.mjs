import fs from "node:fs";

const required = [
  ["src/components/markets/chart-execution-panel.tsx", "/api/chart/trade"],
  ["src/app/api/chart/trade/route.ts", "executeApprovedOpportunity"],
  ["src/components/markets/market-chart-terminal.tsx", "ChartExecutionPanel"],
  ["src/components/markets/zerion-provider-chart.tsx", "autoStructureLines"],
  ["src/components/charts/zerion-pro-chart.tsx", "autoTrend"],
  ["src/app/api/automation/market-scan/route.ts", "export const POST=run"],
  ["src/workers/background-ai-loop.ts", "AbortSignal.timeout(55_000)"],
  ["src/workers/realtime-worker.ts", "scannerUpstoxKeys"],
  ["src/lib/market/quote-store.ts", "/subscriptions/scanner"],
  ["src/lib/market/quote-store.ts", "coindcx-futures"],
  ["src/lib/agents/deterministic-scanner.ts", "developing-not-executable"],
  ["src/components/notifications/developing-setup-list.tsx", "Developing Setups"],
  ["src/components/notifications/agent-opportunity-inbox.tsx", "DevelopingSetupList"],
  ["src/lib/dashboard/trading-context.ts", "zerion:workspace"],
  ["src/components/paper/paper-section-workspace.tsx", 'writeTradingContext("paper"'],
  ["src/components/live/live-section-workspace.tsx", 'writeTradingContext("live"'],
  ["src/app/api/live/reconcile/route.ts", "broker_lifecycle_state"],
  ["src/app/api/live/reconcile/route.ts", "margin/fetch_orders"],
  ["src/lib/brokers/upstox-client.ts", "gttOrders"],
  ["supabase/migrations/20260828_scanner_lifecycle_hardening.sql", "agent_developing_setups"],
  ["supabase/migrations/20260828_scanner_lifecycle_hardening.sql", "broker_lifecycle_state"],
  ["src/app/layout.tsx", "zerion-v4-completion.css"],
];

let failed = false;
for (const [file, needle] of required) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  if (!text.includes(needle)) {
    console.error("[missing]", file, needle);
    failed = true;
  } else {
    console.log("[ok]", file);
  }
}
if (failed) process.exit(1);
console.log("ZIP4 static wiring verification passed.");
