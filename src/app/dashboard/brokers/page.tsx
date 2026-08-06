import { BrokerCatalog } from "@/components/brokers/broker-catalog";
import { ConnectionHealth } from "@/components/brokers/connection-health";
export default function Page(){return <main className="dashboard-page"><div className="page-heading"><div><p className="eyebrow">Provider connections</p><h1>Broker & Exchange Connections</h1><p>Connect named Indian brokers, crypto exchanges and forex providers. Tokens remain server-side.</p></div></div><ConnectionHealth/><div className="mt-6"><BrokerCatalog/></div></main>;}
