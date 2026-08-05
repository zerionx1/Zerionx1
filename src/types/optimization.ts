export interface ParameterRange { key:string; min:number; max:number; step:number; }
export interface OptimizationRequest { id:string; strategyId:string; objective:"net-profit"|"sharpe"|"drawdown-adjusted"|"profit-factor"; ranges:ParameterRange[]; maxRuns:number; trainingStart:string; trainingEnd:string; validationStart:string; validationEnd:string; }
export interface OptimizationCandidate { rank:number; parameters:Record<string,number>; score:number; netProfitPct:number; maxDrawdownPct:number; sharpeRatio:number; validationScore:number; overfitRisk:"low"|"medium"|"high"; }
export interface OptimizationResult { id:string; requestId:string; candidates:OptimizationCandidate[]; completedRuns:number; warnings:string[]; }
