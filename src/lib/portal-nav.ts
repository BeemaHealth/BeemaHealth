import {
  FileText,
  FolderOpen,
  LayoutGrid,
  MessageSquare,
  Package,
  RefreshCw,
  User,
  type LucideIcon,
} from "lucide-react";

export const PORTAL_FEATURES = {
  messages: false,
} as const;

export type PortalNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  enabled?: boolean;
};

export const PORTAL_NAV: PortalNavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/dashboard/intake", label: "Medical intake", icon: FileText },
  {
    to: "/dashboard/messages",
    label: "Messages",
    icon: MessageSquare,
    enabled: PORTAL_FEATURES.messages,
  },
  // { to: "/dashboard/orders", label: "Orders", icon: Package },
  { to: "/dashboard/refills", label: "Refills", icon: RefreshCw },
  { to: "/dashboard/documents", label: "Documents", icon: FolderOpen },
  { to: "/dashboard/account", label: "Account", icon: User },
];

export function getVisiblePortalNav(): PortalNavItem[] {
  return PORTAL_NAV.filter((item) => item.enabled !== false);
}
