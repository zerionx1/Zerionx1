"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, UserRound, X } from "lucide-react";
import { dashboardNav } from "@/config/dashboard-nav";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobile = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside
      className={cn(
        "flex min-h-screen w-72 flex-col border-r border-white/10 bg-[#16080c] p-5",
        mobile ? "w-full border-r-0" : "hidden lg:flex",
      )}
    >
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          onClick={onClose}
          className="gold-text text-lg font-black tracking-[.2em]"
        >
          ZERION X1
        </Link>

        {mobile ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-full border border-white/10 p-2 text-[var(--mist)]"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <nav className="mt-8 flex-1 space-y-1 overflow-y-auto">
        {dashboardNav.map(({ label, href, icon: Icon, badge }) => {
          const active =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(`${href}/`));

          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition",
                active
                  ? "bg-white/10 text-white"
                  : "text-[var(--mist)] hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {badge ? (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
                  {badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 space-y-2 border-t border-white/10 pt-5">
        <Link
          href="/dashboard/settings"
          onClick={onClose}
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[var(--mist)] hover:bg-white/5 hover:text-white"
        >
          <UserRound className="h-4 w-4" />
          Profile & Account
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-[var(--mist)] hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
