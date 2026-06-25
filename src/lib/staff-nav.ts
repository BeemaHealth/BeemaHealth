import {
  BarChart3,
  FlaskConical,
  LayoutDashboard,
  ListChecks,
  Pill,
  Users,
} from "lucide-react";

export const STAFF_NAV = [
  { to: "/staff", label: "Dashboard", icon: LayoutDashboard },
  { to: "/staff/patients", label: "Patients", icon: Users },
  { to: "/staff/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/staff/medications", label: "Medications", icon: Pill },
  { to: "/staff/questionnaires", label: "Questionnaires", icon: ListChecks },
  { to: "/staff/experiments", label: "Experiments", icon: FlaskConical },
] as const;
