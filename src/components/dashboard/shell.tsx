"use client";
import { useState } from "react";
import { ArrowLeft, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  return (
    <div className="x1-app-shell">
      <div className="x1-ambient x1-ambient--one" />
      <div className="x1-ambient x1-ambient--two" />
      <div className="relative flex min-h-screen">
        <Sidebar />
        {mobileMenuOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close navigation backdrop"
              className="absolute inset-0 bg-[#2F2A25]/80 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative h-full w-[88%] max-w-sm">
              <Sidebar mobile onClose={() => setMobileMenuOpen(false)} />
            </div>
          </div>
        ) : null}
        <div className="min-w-0 flex-1 pb-24 lg:pb-0">
          <div className="x1-mobile-header lg:hidden">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Go back"
              className="zx-page-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <LinkBrand />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open dashboard navigation"
              className="zx-page-back"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
          <Topbar />
          {children}
        </div>
      </div>
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
