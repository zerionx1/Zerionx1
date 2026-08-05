import { sampleSignals } from "@/lib/signals/sample-signals";
import type { TradingSignal } from "@/types/signal";
export interface SignalStore { list():Promise<TradingSignal[]>; get(id:string):Promise<TradingSignal|null>; }
class SampleSignalStore implements SignalStore { async list(){return structuredClone(sampleSignals)} async get(id:string){return structuredClone(sampleSignals.find(x=>x.id===id)??null)} }
export const signalStore:SignalStore=new SampleSignalStore();
