"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="flex min-h-screen">
        <Sidebar />

        {mobileMenuOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close navigation backdrop"
              className="absolute inset-0 bg-black/70"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative h-full w-[88%] max-w-sm">
              <Sidebar
                mobile
                onClose={() => setMobileMenuOpen(false)}
              />
            </div>
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-[#16080c]/95 px-4 py-3 backdrop-blur lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open dashboard navigation"
              className="rounded-full border border-white/10 p-2 text-[var(--mist)]"
            >
              <Menu className="h-5 w-5" />
            </button>

            <span className="gold-text text-sm font-black tracking-[.18em]">
              ZERION X1
            </span>
          </div>

          <Topbar />
          {children}
        </div>
      </div>
    </div>
  );
}
