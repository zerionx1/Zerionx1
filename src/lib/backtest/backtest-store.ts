import type { BacktestResult } from "@/types/backtest";
const results:BacktestResult[]=[];
export function listBacktests(){return structuredClone(results)}
export function getBacktest(id:string){const item=results.find(r=>r.id===id);return item?structuredClone(item):undefined}
export function saveBacktest(result:BacktestResult){const i=results.findIndex(r=>r.id===result.id);if(i>=0)results[i]=result;else results.unshift(result);return structuredClone(result)}
