"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const KEY = "zerion:last-dashboard-route";

export function useDashboardRouteMemory() {
  const pathname = usePathname();
  const params = useSearchParams();

  useEffect(() => {
    if (!pathname.startsWith("/dashboard")) return;
    const query = params.toString();
    sessionStorage.setItem(KEY, query ? `${pathname}?${query}` : pathname);
  }, [params, pathname]);
}

export function getLastDashboardRoute() {
  if (typeof window === "undefined") return "/dashboard";
  return sessionStorage.getItem(KEY) ?? "/dashboard";
}
