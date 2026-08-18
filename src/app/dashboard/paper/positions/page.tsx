import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PaperPositionsWorkspace } from "@/components/paper/paper-positions-workspace";

export default function PaperPositionsPage() {
  return <main className="dashboard-page">
    <Link href="/dashboard/paper" className="zx-secondary-action inline-flex"><ArrowLeft className="mr-2 h-4 w-4"/>Back to paper terminal</Link>
    <div className="page-heading mt-5"><div><p className="eyebrow">PAPER POSITIONS</p><h1>Positions, P&amp;L and Square Off</h1><p>Running profit/loss, realized P&amp;L and explicit paper exits.</p></div></div>
    <PaperPositionsWorkspace/>
  </main>;
}
