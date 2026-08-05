import { sampleQuotes } from "@/lib/market/sample-data";
import type { MarketQuote } from "@/types/market";
export interface QuoteStore { list(): Promise<MarketQuote[]>; get(instrumentId:string): Promise<MarketQuote|null>; }
export class SampleQuoteStore implements QuoteStore {
 async list(){ return structuredClone(sampleQuotes); }
 async get(instrumentId:string){ return structuredClone(sampleQuotes.find(q=>q.instrumentId===instrumentId) ?? null); }
}
export const quoteStore: QuoteStore = new SampleQuoteStore();
