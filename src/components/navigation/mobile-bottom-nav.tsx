"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gauge, ListFilter, Sparkles, Store, UserRound } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const items = [
  { label: "Home", href: "/dashboard", icon: Gauge },
  { label: "Wizard", href: "/dashboard/strategies", icon: Sparkles },
  { label: "Markets", href: "/dashboard/markets", icon: Store },
  { label: "Watchlist", href: "/dashboard/watchlists", icon: ListFilter },
  { label: "More", href: "/dashboard/account", icon: UserRound },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="x1-mobile-nav lg:hidden" aria-label="Primary mobile navigation">
      {items.map(({ label, href, icon: Icon }) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
        return (
          <Link key={href} href={href} className={cn("x1-mobile-nav__item", active && "is-active")}>
            <span className="x1-mobile-nav__icon"><Icon aria-hidden="true" /></span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
