import { BrokerConnectionCenter } from "@/components/brokers/broker-connection-center";

export default function BrokersPage() {
  return (
    <main className="dashboard-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Data and execution connectivity</p>
          <h1 className="mt-2 text-4xl font-semibold md:text-5xl">Broker & Provider Hub</h1>
          <p className="mt-3 max-w-2xl">
            Connect supported Indian, crypto and FX providers. Live order execution remains disabled until authorization and risk checks pass.
          </p>
        </div>
        <span className="status-pill">Fail closed</span>
      </div>
      <BrokerConnectionCenter />
    </main>
  );
}
