import { NotificationPreferences } from "@/components/notifications/notification-preferences";
import { AgentOpportunityInbox } from "@/components/notifications/agent-opportunity-inbox";

export default function Page() {
  return (
    <main className="dashboard-page x1-page-enter">
      <div className="page-heading x1-page-heading">
        <div>
          <p className="eyebrow">Notification control</p>
          <h1>Alerts &amp; Delivery</h1>
          <p>
            Review Zerion market opportunities and control how account, risk,
            market and simulated execution events are delivered.
          </p>
        </div>
      </div>
      <div className="space-y-6">
        <AgentOpportunityInbox />
        <NotificationPreferences />
      </div>
    </main>
  );
}
