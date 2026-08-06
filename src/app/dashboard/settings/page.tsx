import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProfileSettings } from "@/components/settings/profile-settings";
export default function Page(){return <main className="dashboard-page x1-page-enter"><Link href="/dashboard/account" className="x1-back-link"><ArrowLeft/>Back to account</Link><div className="page-heading x1-page-heading"><div><p className="eyebrow">Persistent configuration</p><h1>Profile & Preferences</h1><p>Identity, timezone, base currency and risk preference are stored in your authenticated Supabase profile.</p></div></div><ProfileSettings/></main>}
