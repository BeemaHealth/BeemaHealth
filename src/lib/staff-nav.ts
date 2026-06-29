import {
  BarChart3,
  FlaskConical,
  LayoutDashboard,
  Link2,
  ListChecks,
  Pill,
  Plug,
  Terminal,
  Users,
} from "lucide-react";

export const STAFF_NAV = [
  { to: "/staff", label: "Dashboard", icon: LayoutDashboard },
  { to: "/staff/patients", label: "Patients", icon: Users },
  { to: "/staff/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/staff/landing-pages", label: "Landing Pages", icon: Link2 },
  // { to: "/staff/medications", label: "Medications", icon: Pill },
  { to: "/staff/questionnaires", label: "Questionnaires", icon: ListChecks },
  { to: "/staff/vendors", label: "Vendors", icon: Plug },
  // { to: "/staff/experiments", label: "Experiments", icon: FlaskConical },
  { to: "/staff/dev", label: "Dev", icon: Terminal },
] as const;
