import { FnoCommandCenter } from "@/components/markets/fno-command-center";

export default function FnoPage(){
  return (
    <main className="dashboard-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">INDIAN MARKET · NFO</p>
          <h1 className="mt-2 text-4xl font-semibold md:text-5xl">F&O Command Center</h1>
          <p className="mt-3 max-w-3xl">
            Futures and options workspace for NIFTY, BANK NIFTY, FIN NIFTY,
            MIDCP NIFTY and supported stock derivatives.
          </p>
        </div>
      </div>
      <FnoCommandCenter/>
    </main>
  );
}
