import {describe,expect,it} from "vitest";
import {mergeLiveQuoteIntoCandles} from "@/lib/market-data/live-candle-builder";
import type {ZerionLiveQuote} from "@/hooks/use-zerion-market-stream";
const q=(timestamp:string,price:number):ZerionLiveQuote=>({provider:"coindcx",symbol:"BTC/USDT",providerSymbol:"B-BTC_USDT",instrumentId:"coindcx:B-BTC_USDT",timestamp,price,change:0,changePercent:0,previousClose:price,open:price,high:price,low:price});
describe("live candle builder",()=>{
 it("updates same candle from a real tick",()=>{const r=mergeLiveQuoteIntoCandles([{time:"2026-08-20T10:00:00.000Z",open:100,high:102,low:99,close:101}],q("2026-08-20T10:04:59.000Z",103),"5m");expect(r).toHaveLength(1);expect(r[0]).toMatchObject({open:100,high:103,low:99,close:103})});
 it("opens new candle on timeframe boundary",()=>{const r=mergeLiveQuoteIntoCandles([{time:"2026-08-20T10:00:00.000Z",open:100,high:102,low:99,close:101}],q("2026-08-20T10:05:00.000Z",104),"5m");expect(r).toHaveLength(2);expect(r[1]).toMatchObject({time:"2026-08-20T10:05:00.000Z",open:104,high:104,low:104,close:104})});
 it("does not synthesize missing gap candles",()=>{const r=mergeLiveQuoteIntoCandles([{time:"2026-08-20T10:00:00.000Z",open:100,high:102,low:99,close:101}],q("2026-08-20T10:20:01.000Z",110),"5m");expect(r).toHaveLength(2)});
});
