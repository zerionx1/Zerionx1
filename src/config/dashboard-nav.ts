import {
  Activity, BarChart3, Bell, BookOpen, BrainCircuit, ChartCandlestick, CreditCard,
  FileBarChart, Gauge, ListFilter, NotebookTabs, Settings, ShieldCheck, TestTube2,
  UserRound, WalletCards,
} from "lucide-react";
import type { NavigationItem } from "@/types/navigation";

export const dashboardNav: NavigationItem[] = [
  { label: "Command Center", href: "/dashboard", icon: Gauge },
  { label: "Markets", href: "/dashboard/markets", icon: ChartCandlestick },
  { label: "Charts", href: "/dashboard/charts", icon: BarChart3 },
  { label: "Signals", href: "/dashboard/signals", icon: Activity },
  { label: "Watchlists", href: "/dashboard/watchlists", icon: ListFilter },
  { label: "Alerts", href: "/dashboard/alerts", icon: Bell },
  { label: "Paper Trading", href: "/dashboard/paper", icon: WalletCards },
  { label: "Live Trading", href: "/dashboard/live-trading", icon: Activity },
  { label: "Zerion AI", href: "/dashboard/ai", icon: BrainCircuit },
  { label: "Strategies", href: "/dashboard/strategies", icon: BrainCircuit },
  { label: "Backtests", href: "/dashboard/backtests", icon: TestTube2 },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Risk OS", href: "/dashboard/risk", icon: ShieldCheck },
  { label: "Journal", href: "/dashboard/journal", icon: NotebookTabs },
  { label: "Learn", href: "/dashboard/learn", icon: BookOpen },
  { label: "Reports", href: "/dashboard/reports", icon: FileBarChart },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { label: "Brokers", href: "/dashboard/brokers", icon: Activity },
  { label: "Portfolio", href: "/dashboard/portfolio", icon: Activity },
  { label: "Plan & Billing", href: "/dashboard/billing", icon: CreditCard },
  { label: "Account", href: "/dashboard/account", icon: UserRound },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];
