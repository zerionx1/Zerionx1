import { marketUniverse } from "@/config/market-universe";
import { quoteStore } from "@/lib/market/quote-store";
import type { MarketInstrument, MarketKind, MarketOverviewItem } from "@/types/market";

export function searchMarketCatalog(query:string, market?:MarketKind):MarketInstrument[]{
  const normalized=query.trim().toLowerCase();
  return marketUniverse.filter((instrument)=>{
    if(market&&instrument.market!==market)return false;
    if(!normalized)return true;
    const haystack=[instrument.symbol,instrument.displayName,instrument.exchange,instrument.sector,instrument.market].join(" ").toLowerCase();
    return haystack.includes(normalized);
  }).slice(0,50);
}

export async function marketOverview(market?:MarketKind):Promise<MarketOverviewItem[]>{
  const instruments=searchMarketCatalog("",market).slice(0,30);
  return Promise.all(instruments.map(async(instrument)=>{
    const quote=await quoteStore.get(instrument.symbol).catch(()=>null);
    return {
      ...instrument,
      quote,
      availability: quote ? "live" : instrument.providerRequired ? "provider-required" : "unavailable",
    } satisfies MarketOverviewItem;
  }));
}
