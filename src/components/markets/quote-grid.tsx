import { quoteStore } from "@/lib/market/quote-store"; import { QuoteCard } from "@/components/markets/quote-card";
export async function QuoteGrid(){const quotes=await quoteStore.list();return <div className="quote-grid">{quotes.map(q=><QuoteCard key={q.instrumentId} quote={q}/>)}</div>}
