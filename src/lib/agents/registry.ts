export type ZerionAgentId =
  | "market-monitor"
  | "research"
  | "deep-analysis"
  | "technical"
  | "opportunity"
  | "decision-support";
export type ZerionAgentDefinition = {
  id: ZerionAgentId;
  name: string;
  purpose: string;
  powerXCapability: string;
  fallback: "deterministic" | "degraded";
};
export const zerionAgents: ZerionAgentDefinition[] = [
  {
    id: "market-monitor",
    name: "Market Monitor",
    purpose: "Continuously inspect provider quotes and market state.",
    powerXCapability: "market-monitor",
    fallback: "deterministic",
  },
  {
    id: "research",
    name: "Research Agent",
    purpose:
      "Add news, fundamentals and contextual research when PowerX is available.",
    powerXCapability: "research",
    fallback: "degraded",
  },
  {
    id: "deep-analysis",
    name: "Deep Analysis Agent",
    purpose: "Hedge-fund-style multi-factor reasoning and scenario analysis.",
    powerXCapability: "deep-analysis",
    fallback: "degraded",
  },
  {
    id: "technical",
    name: "Technical Agent",
    purpose: "Indicators, trend, volatility, momentum and structure analysis.",
    powerXCapability: "technical-analysis",
    fallback: "deterministic",
  },
  {
    id: "opportunity",
    name: "Opportunity Agent",
    purpose: "Rank candidate opportunities after risk filters.",
    powerXCapability: "opportunity-detection",
    fallback: "deterministic",
  },
  {
    id: "decision-support",
    name: "Decision Support",
    purpose:
      "Create explainable user proposals and notifications. Never bypass user execution consent.",
    powerXCapability: "decision-support",
    fallback: "deterministic",
  },
];
