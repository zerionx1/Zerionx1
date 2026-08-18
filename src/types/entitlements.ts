export type Plan = "free" | "starter" | "pro" | "elite" | "ultra" | "prime" | "enterprise";
export type Market = "india" | "crypto" | "forex";
export type Entitlements = { plan: Plan; markets: Market[]; paperAccounts:number; strategyLimit:number; backtestRunsPerMonth:number; aiCreditsPerMonth:number; automationActionsPerMonth:number; liveExecutionsPerMonth:number|null; priority:"standard"|"priority"|"highest"|"custom"; concurrentStrategies:number; cryptoIncludedWhenLive?:boolean; };
