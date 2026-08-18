import { BrokerConnectionCenter } from "@/components/brokers/broker-connection-center";

export default function BrokersPage() {
  return (
    <main className="dashboard-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Connect your trading account</p>
          <h1 className="mt-2 text-4xl font-semibold md:text-5xl">
            Trading Connections
          </h1>
          <p className="mt-3 max-w-2xl">
            Already have an account? Link it securely. New to a provider?
            Create an account first, then return here and connect it.
          </p>
        </div>
        <span className="status-pill">User-authorized access</span>
      </div>

      <BrokerConnectionCenter />
    </main>
  );
}
