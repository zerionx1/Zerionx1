import Link from "next/link";
import { MarketTable } from "@/components/markets/market-table";
import { MarketChartPanel } from "@/components/markets/market-chart-panel";
import { quoteStore } from "@/lib/market/quote-store";
const workspaces=[
 {title:"Indian Equity",symbols:"NIFTY 50 · BANKNIFTY · NSE/BSE stocks",configured:Boolean(process.env.ZERION_MARKET_DATA_BASE_URL)},
 {title:"F&O",symbols:"Index and stock futures/options",configured:Boolean(process.env.ZERION_MARKET_DATA_BASE_URL)},
 {title:"Commodities",symbols:"MCX gold · silver · crude oil",configured:Boolean(process.env.ZERION_MARKET_DATA_BASE_URL)},
 {title:"Crypto",symbols:"BTC · ETH · liquid USDT pairs",configured:true},
 {title:"Forex",symbols:"EUR/USD · GBP/USD · USD/JPY",configured:Boolean(process.env.ZERION_MARKET_DATA_BASE_URL)},
];
export default async function MarketsPage(){const quotes=await quoteStore.list(["BTC/USDT","ETH/USDT"]);return <main className="dashboard-page"><div className="page-heading"><div><p className="eyebrow">Multi-market discovery</p><h1>Market Explorer</h1><p>Open a market workspace, search instruments and use provider-backed quotes only.</p></div></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{workspaces.map(item=><section className="panel" key={item.title}><div className="flex justify-between gap-3"><h2>{item.title}</h2><span className="data-badge">{item.configured?"ready":"provider required"}</span></div><p className="mt-3 text-sm text-white/55">{item.symbols}</p><Link className="mt-5 inline-block text-amber-100" href="/dashboard/watchlists">Open workspace →</Link></section>)}</div><div className="mt-6"><MarketChartPanel/></div><section className="panel mt-6"><div className="panel-header"><h2>Live provider instruments</h2><span className="data-badge">{quotes.length} available</span></div>{quotes.length?<MarketTable quotes={quotes}/>:<p className="text-white/55">No provider returned a quote. Configure ZERION_MARKET_DATA_BASE_URL for Indian and forex instruments.</p>}</section></main>;}
