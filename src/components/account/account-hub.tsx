"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronRight,
  CircleCheckBig,
  FileBarChart,
  KeyRound,
  LogOut,
  Palette,
  PlugZap,
  ReceiptText,
  Shield,
  Trash2,
  UserRound,
  WalletCards,
} from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Profile = {
  full_name?: string;
  timezone?: string;
  base_currency?: string;
  risk_profile?: string;
  created_at?: string;
  role?: string;
  plan_code?: string;
  onboarding_completed?: boolean;
};

const groups = [
  {
    title: "Workspace",
    items: [
      ["Profile & workspace", "Name, timezone, currency and risk profile", "/dashboard/settings", UserRound],
      ["Broker & exchanges", "Connect live providers and trading accounts", "/dashboard/brokers", PlugZap],
      ["Paper trading", "Practice with live-provider pricing and no real money", "/dashboard/paper", WalletCards],
      ["Reports center", "Portfolio, journal and strategy reports", "/dashboard/reports", FileBarChart],
    ],
  },
  {
    title: "Preferences & security",
    items: [
      ["Notifications", "In-app, email and trading alert preferences", "/dashboard/notifications", Bell],
      ["Appearance & region", "Theme, locale, timezone and base currency", "/dashboard/settings", Palette],
      ["Privacy & sessions", "Authentication and active session controls", "/dashboard/account#security", Shield],
      ["Password & access", "Use the verified password recovery workflow", "/forgot-password", KeyRound],
      ["Subscription & invoices", "Plan details, entitlements and billing history", "/dashboard/reports", ReceiptText],
    ],
  },
] as const;

export function AccountHub() {
  const [profile, setProfile] = useState<Profile>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile", { cache: "no-store" })
      .then((response) => response.json())
      .then((json) => {
        if (!cancelled) setProfile(json.data ?? {});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const progress = useMemo(() => {
    const checks = [
      Boolean(profile.full_name),
      Boolean(profile.timezone),
      Boolean(profile.base_currency),
      Boolean(profile.risk_profile),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [profile]);

  async function logout() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    await fetch("/api/auth/sync", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <section className="x1-profile-card">
        <div className="x1-profile-avatar">
          {(profile.full_name || "ZX")
            .split(" ")
            .map((value) => value[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>

        <div>
          <span className="x1-kicker">Zerion X1 workspace</span>
          <h2>{loading ? "Loading account…" : profile.full_name || "Complete your profile"}</h2>
          <p>
            {profile.plan_code || "FREE"} plan · {profile.base_currency || "INR"} ·{" "}
            {profile.timezone || "Timezone not selected"}
          </p>
        </div>

        <Link href="/dashboard/settings" className="x1-secondary-link">
          Edit profile
        </Link>
      </section>

      <section className="zx-account-progress">
        <div>
          <span className="x1-kicker">Workspace readiness</span>
          <strong className="mt-1 block text-lg">{progress}% configured</strong>
          <div className="zx-progress-track" aria-label={`Account ${progress}% configured`}>
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
        {progress < 100 ? (
          <Link href="/dashboard/settings" className="zx-primary-action">
            Finish setup
          </Link>
        ) : (
          <span className="inline-flex items-center gap-2 text-sm text-[var(--zx-stone)]">
            <CircleCheckBig className="h-4 w-4" /> Ready
          </span>
        )}
      </section>

      <section>
        <div className="mb-3">
          <span className="x1-kicker">What to do next</span>
        </div>
        <div className="zx-next-steps">
          <Link href="/dashboard/settings" className="zx-step">
            <span className="zx-step-number">01</span>
            <h3>Complete profile</h3>
            <p>Set timezone, currency and risk profile so the workspace can personalize limits.</p>
          </Link>
          <Link href="/dashboard/brokers" className="zx-step">
            <span className="zx-step-number">02</span>
            <h3>Connect data/broker</h3>
            <p>Choose a supported provider. Secrets stay server-side and can be revoked.</p>
          </Link>
          <Link href="/dashboard/paper" className="zx-step">
            <span className="zx-step-number">03</span>
            <h3>Paper trade</h3>
            <p>Validate entries, position sizing and P&amp;L before enabling live execution.</p>
          </Link>
          <Link href="/dashboard/strategies" className="zx-step">
            <span className="zx-step-number">04</span>
            <h3>Build a strategy</h3>
            <p>Start from a curated template, backtest it and keep it private to your account.</p>
          </Link>
        </div>
      </section>

      {groups.map((group) => (
        <section className="x1-menu-group" key={group.title}>
          <h3>{group.title}</h3>
          {group.items.map(([title, description, href, Icon]) => (
            <Link href={href} className="x1-menu-row" key={title}>
              <span className="x1-menu-icon"><Icon /></span>
              <span>
                <strong>{title}</strong>
                <small>{description}</small>
              </span>
              <ChevronRight className="h-4 w-4 text-white/35" />
            </Link>
          ))}
        </section>
      ))}

      <section id="security" className="x1-menu-group">
        <h3>Account actions</h3>
        <button onClick={logout} className="x1-menu-row w-full text-left">
          <span className="x1-menu-icon"><LogOut /></span>
          <span>
            <strong>Secure logout</strong>
            <small>End the authenticated session on this device.</small>
          </span>
          <ChevronRight className="h-4 w-4 text-white/35" />
        </button>
        <Link href="mailto:zerionx1@gmail.com?subject=Zerion%20X1%20account%20deletion" className="x1-menu-row text-rose-200">
          <span className="x1-menu-icon"><Trash2 /></span>
          <span>
            <strong>Request account deletion</strong>
            <small>Start a verified support and data-export workflow.</small>
          </span>
          <ChevronRight className="h-4 w-4 text-white/35" />
        </Link>
      </section>
    </div>
  );
}
