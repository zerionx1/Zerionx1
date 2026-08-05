import { Activity, Boxes, Flag, LayoutDashboard, Plug, ScrollText, ShieldAlert, Users } from "lucide-react";

import type { NavItem } from "@/types/navigation";

export const adminNav: NavItem[] = [
  { label: "Control Center", href: "/admin", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Features", href: "/admin/features", icon: Flag },
  { label: "Integrations", href: "/admin/integrations", icon: Plug },
  { label: "Visual Builder", href: "/admin/builder", icon: Boxes },
  { label: "Risk Controls", href: "/admin/risk", icon: ShieldAlert },
  { label: "Audit", href: "/admin/audit", icon: ScrollText },
  { label: "System Health", href: "/admin/health", icon: Activity },
  { label: "Execution Ops", href: "/admin/execution", icon: Activity },
  { label: "Brokers", href: "/admin/brokers", icon: Activity },
];
