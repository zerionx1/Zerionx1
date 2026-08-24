"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { StrategyDefinition } from "@/types/strategy";

type Candidate = { fast: number; slow: number; stop: number; target: number; score: number; status: "planned" | "rejected" };

export function OptimizationLab({ strategies }: { strategies: StrategyDefinition[] }) {
  const [strategyId, setStrategyId] = useState(strategies[0]?.id ?? "");
  const [fastValues, setFastValues] = useState("10,20,30");
  const [slowValues, setSlowValues] = useState("50,100");
  const [stops, setStops] = useState("1.5,2,2.5");
  const [targets, setTargets] = useState("1.5,2,3");
  const [planned, setPlanned] = useState(false);

  const candidates = useMemo<Candidate[]>(() => {
    if (!planned) return [];
    const parse = (value: string) => value.split(",").map(Number).filter(Number.isFinite).slice(0, 8);
    const rows: Candidate[] = [];
    for (const fast of parse(fastValues)) for (const slow of parse(slowValues)) for (const stop of parse(stops)) for (const target of parse(targets)) {
      const rejected = fast >= slow || stop <= 0 || target < 1;
      rows.push({ fast, slow, stop, target, score: rejected ? 0 : Number(((target / stop) * (slow / Math.max(fast, 1))).toFixed(2)), status: rejected ? "rejected" : "planned" });
      if (rows.length >= 120) return rows;
    }
    return rows;
  }, [fastValues, planned, slowValues, stops, targets]);

  const valid = candidates.filter((item) => item.status === "planned").sort((a,b)=>b.score-a.score);
  return <div className="grid gap-6 xl:grid-cols-[.8fr_1.4fr]"><section className="panel h-fit"><p className="eyebrow">Walk-forward preparation</p><h2 className="mt-2 text-2xl font-semibold">Parameter search space</h2><p className="mt-3 text-sm leading-6 text-[#2F2A25]">Generate controlled candidate sets before historical execution. Invalid combinations are rejected instead of silently tested.</p><div className="mt-6 grid gap-4"><label className="grid gap-2 text-sm text-[#2F2A25]">Strategy<select className="luxury-input" value={strategyId} onChange={(e)=>setStrategyId(e.target.value)}>{strategies.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><Field label="Fast EMA values" value={fastValues} setValue={setFastValues}/><Field label="Slow EMA values" value={slowValues} setValue={setSlowValues}/><Field label="ATR stop multiples" value={stops} setValue={setStops}/><Field label="Risk-reward targets" value={targets} setValue={setTargets}/><Button disabled={!strategyId} onClick={()=>setPlanned(true)}>Generate candidates</Button></div></section><section className="space-y-5"><div className="grid gap-3 sm:grid-cols-3"><div className="panel luxury-stat"><span>Total combinations</span><strong>{candidates.length}</strong></div><div className="panel luxury-stat"><span>Valid candidates</span><strong>{valid.length}</strong></div><div className="panel luxury-stat"><span>Rejected</span><strong>{candidates.length-valid.length}</strong></div></div><div className="panel"><div className="panel-header"><div><p className="eyebrow">Ranked planning output</p><h2 className="mt-2 text-2xl font-semibold">Candidate matrix</h2></div><span className="data-badge">No fabricated returns</span></div><p className="mt-3 text-sm text-[#2F2A25]">The score below ranks structural efficiency only. Actual performance is calculated later using real historical candles and out-of-sample validation.</p><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="text-[#2F2A25]"><tr><th className="p-3">Fast</th><th className="p-3">Slow</th><th className="p-3">ATR stop</th><th className="p-3">Target R</th><th className="p-3">Structural score</th><th className="p-3">Status</th></tr></thead><tbody>{candidates.slice(0,80).map((item,index)=><tr key={`${item.fast}-${item.slow}-${item.stop}-${item.target}-${index}`} className="border-t border-[#E6D8C3]"><td className="p-3">{item.fast}</td><td className="p-3">{item.slow}</td><td className="p-3">{item.stop}</td><td className="p-3">{item.target}</td><td className="p-3">{item.score}</td><td className="p-3"><span className="data-badge">{item.status}</span></td></tr>)}</tbody></table>{!planned ? <p className="py-16 text-center text-[#2F2A25]">Generate a bounded search space to begin.</p> : null}</div></div></section></div>;
}
function Field({label,value,setValue}:{label:string;value:string;setValue:(value:string)=>void}){return <label className="grid gap-2 text-sm text-[#2F2A25]">{label}<input className="luxury-input" value={value} onChange={(e)=>setValue(e.target.value)} /></label>}
