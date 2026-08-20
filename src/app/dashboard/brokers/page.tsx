import { BrokerConnectionCenter } from "@/components/brokers/broker-connection-center";
import { UpstoxPersistentStatus } from "@/components/brokers/upstox-persistent-status";

export default function BrokersPage() {
  return (
    <main className="dashboard-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Connect your trading account</p>
          <h1>Trading Connections</h1>
          <p>
            Persisted broker state is recognized automatically on reload.
            Refresh is only a health check.
          </p>
        </div>
        <span className="status-pill">User-authorized access</span>
      </div>
      <UpstoxPersistentStatus />
      <BrokerConnectionCenter />
    </main>
  );
}
