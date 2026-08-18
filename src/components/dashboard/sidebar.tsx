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
    await fetch("/api/auth/sync", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  }
  return (
    <aside
      className={cn(
        "x1-sidebar flex min-h-screen w-72 flex-col border-r p-5",
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
            className="zx-page-back"
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
                "x1-sidebar-link flex items-center gap-3 rounded-xl px-4 py-3 text-sm",
                active && "is-active",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {badge ? (
                <span className="data-badge px-2 py-0.5 text-xs">{badge}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="mt-6 space-y-2 border-t border-[rgba(230,216,195,.14)] pt-5">
        <Link
          href="/dashboard/settings"
          onClick={onClose}
          className="x1-sidebar-link flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
        >
          <UserRound className="h-4 w-4" />
          Profile & Account
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="x1-sidebar-link flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
