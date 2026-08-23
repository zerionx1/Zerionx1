"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Gauge, Menu, Store, WalletCards } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const items = [
  { label: "Home", href: "/dashboard", icon: Gauge },
  { label: "Markets", href: "/dashboard/markets", icon: Store },
  { label: "Charts", href: "/dashboard/charts", icon: BarChart3 },
  { label: "Positions", href: "/dashboard/positions", icon: WalletCards },
] as const;

export function MobileBottomNav({ onMore }: { onMore?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="x1-mobile-nav zx-mobile-nav-v4 fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Primary mobile navigation">
      {items.map(({ label, href, icon: Icon }) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
        return <Link key={href} href={href} className={cn("x1-mobile-nav__item zx-mobile-nav-item", active && "is-active")}>
          <span className="x1-mobile-nav__icon"><Icon aria-hidden="true" /></span><span>{label}</span>
        </Link>;
      })}
      <button type="button" className="x1-mobile-nav__item zx-mobile-nav-item" onClick={onMore} aria-label="Open all Zerion pages">
        <span className="x1-mobile-nav__icon"><Menu aria-hidden="true" /></span><span>More</span>
      </button>
    </nav>
  );
}
