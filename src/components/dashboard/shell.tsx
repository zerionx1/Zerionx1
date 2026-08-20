"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Menu } from "lucide-react";
import { useRouter } from "next/navigation";

import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import { PushPermissionBanner } from "@/components/notifications/push-permission-banner";
import { RealtimeNotificationCenter } from "@/components/notifications/realtime-notification-center";
import { DeterministicMarketAlertRuntime } from "@/components/alerts/deterministic-market-alert-runtime";
import { RouteMemoryRuntime } from "@/components/dashboard/route-memory-runtime";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [mobileMenuOpen]);

  return (
    <div className="x1-app-shell bg-[#F3F1EC] text-[#2F2A25]">
      <RouteMemoryRuntime />
      <DeterministicMarketAlertRuntime />
      <RealtimeNotificationCenter />
      <div className="relative flex min-h-screen">
        <Sidebar />
        {mobileMenuOpen ? (
          <div className="fixed inset-0 z-50 overflow-hidden lg:hidden">
            <button
              type="button"
              aria-label="Close navigation backdrop"
              className="absolute inset-0 bg-[#2F2A25]/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative h-[100dvh] w-[88%] max-w-sm overflow-y-auto overscroll-contain bg-[#F7F4ED]">
              <Sidebar mobile onClose={() => setMobileMenuOpen(false)} />
            </div>
          </div>
        ) : null}
        <div className="min-w-0 flex-1 overflow-x-hidden pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-0">
          <div className="x1-mobile-header sticky top-0 z-40 lg:hidden">
            <button onClick={() => router.back()} aria-label="Go back" className="zx-page-back">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <LinkBrand />
            <button onClick={() => setMobileMenuOpen(true)} aria-label="Open dashboard navigation" className="zx-page-back">
              <Menu className="h-5 w-5" />
            </button>
          </div>
          <Topbar />
          <div className="min-w-0 overflow-x-hidden">{children}</div>
        </div>
      </div>
      <PushPermissionBanner />
      <MobileBottomNav onMore={() => setMobileMenuOpen(true)} />
    </div>
  );
}

function LinkBrand() {
  return (
    <a href="/dashboard" className="x1-brand-lockup">
      <span>ZERION</span>
      <strong>X1</strong>
    </a>
  );
}
