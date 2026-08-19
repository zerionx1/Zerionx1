import { LivePositionsTable } from "@/components/portfolio/live-positions-table";
import { PortfolioSummary } from "@/components/portfolio/portfolio-summary";
import { CryptoBalances } from "@/components/portfolio/crypto-balances";

export default function Page() {
  return (
    <main>
      <h1>Unified Portfolio</h1>
      <PortfolioSummary />
      <LivePositionsTable />
      <CryptoBalances />
    </main>
  );
}
