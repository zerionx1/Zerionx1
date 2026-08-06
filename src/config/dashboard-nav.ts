import { Activity, BarChart3, Bell, BookOpen, BrainCircuit, ChartCandlestick, FileBarChart, Gauge, ListFilter, NotebookTabs, Settings, ShieldCheck, SlidersHorizontal, TestTube2, UserRound, WalletCards } from "lucide-react";

import type { NavigationItem } from "@/types/navigation";

export const dashboardNav: NavigationItem[] = [
  { label: "Command Center", href: "/dashboard", icon: Gauge },
  { label: "Markets", href: "/dashboard/markets", icon: ChartCandlestick },
  { label: "Signals", href: "/dashboard/signals", icon: Activity },
  { label: "Watchlists", href: "/dashboard/watchlists", icon: ListFilter },
  { label: "Alerts", href: "/dashboard/alerts", icon: Bell },
  { label: "Paper Trading", href: "/dashboard/paper", icon: WalletCards },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Strategies", href: "/dashboard/strategies", icon: BrainCircuit },
  { label: "Backtests", href: "/dashboard/backtests", icon: TestTube2 },
  { label: "Optimization", href: "/dashboard/optimization", icon: SlidersHorizontal },
  { label: "Risk OS", href: "/dashboard/risk", icon: ShieldCheck },
  { label: "Journal", href: "/dashboard/journal", icon: NotebookTabs },
  { label: "Learn", href: "/dashboard/learn", icon: BookOpen },
  { label: "Reports", href: "/dashboard/reports", icon: FileBarChart },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { label: "Account", href: "/dashboard/account", icon: UserRound },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Execution", href: "/dashboard/execution", icon: Activity },
  { label: "Brokers", href: "/dashboard/brokers", icon: Activity },
  { label: "Portfolio", href: "/dashboard/portfolio", icon: Activity },
];
