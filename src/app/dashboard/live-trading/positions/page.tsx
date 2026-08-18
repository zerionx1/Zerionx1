import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LivePositionsWorkspace } from "@/components/live/live-positions-workspace";

export default function LivePositionsPage(){
  return <main className="dashboard-page">
    <Link href="/dashboard/live-trading" className="zx-secondary-action inline-flex"><ArrowLeft className="mr-2 h-4 w-4"/>Back to live trading</Link>
    <div className="page-heading mt-5"><div><p className="eyebrow">LIVE POSITIONS</p><h1>Real P&amp;L and Exit</h1><p>Sync Upstox or cTrader and explicitly square off / close positions.</p></div></div>
    <LivePositionsWorkspace/>
  </main>;
}
