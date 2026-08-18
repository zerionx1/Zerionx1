import { AccountHub } from "@/components/account/account-hub";

export default function AccountPage() {
  return (
    <main className="dashboard-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Account command center</p>
          <h1 className="mt-2 text-4xl font-semibold md:text-5xl">Your Zerion Workspace</h1>
          <p className="mt-3 max-w-2xl">
            Complete your profile, connect providers, secure your account and move through the platform in a clear order.
          </p>
        </div>
      </div>
      <AccountHub />
    </main>
  );
}
