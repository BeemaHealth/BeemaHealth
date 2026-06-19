import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  Baby,
  ClipboardList,
  FileCheck2,
  FlaskConical,
  Pill,
  Scale,
  Stethoscope,
  TrendingDown,
  UserRound,
  Users,
} from "lucide-react";
import type { AccountSectionTone } from "@/components/portal/AccountSectionCard";
import { INTAKE_STEP_LABELS } from "@/lib/intake-steps";

export type IntakeStepMeta = {
  icon: LucideIcon;
  tone: AccountSectionTone;
  description: string;
};

export const INTAKE_STEP_META: IntakeStepMeta[] = [
  {
    icon: UserRound,
    tone: "contact",
    description: "Name, contact information, and home address",
  },
  {
    icon: Scale,
    tone: "primary",
    description: "Your weight history and treatment goals",
  },
  {
    icon: TrendingDown,
    tone: "shipping",
    description: "Previous weight-loss medications and programs",
  },
  {
    icon: Stethoscope,
    tone: "security",
    description: "Active and past medical conditions",
  },
  {
    icon: Users,
    tone: "consent",
    description: "Family medical history relevant to treatment",
  },
  {
    icon: Pill,
    tone: "communication",
    description: "Prescription and over-the-counter medications",
  },
  {
    icon: AlertTriangle,
    tone: "primary",
    description: "Drug, food, and environmental allergies",
  },
  {
    icon: Baby,
    tone: "shipping",
    description: "Pregnancy status and reproductive health",
  },
  {
    icon: Activity,
    tone: "contact",
    description: "Diet, exercise, alcohol, and smoking",
  },
  {
    icon: FlaskConical,
    tone: "consent",
    description: "Recent lab results and vital signs",
  },
  {
    icon: ClipboardList,
    tone: "security",
    description: "Preferred pharmacy and medication form",
  },
  {
    icon: FileCheck2,
    tone: "communication",
    description: "Review your answers and safety acknowledgments",
  },
];

export function getIntakeStepMeta(step: number): IntakeStepMeta {
  return (
    INTAKE_STEP_META[step] ?? {
      icon: FileCheck2,
      tone: "contact",
      description: INTAKE_STEP_LABELS[step] ?? "Medical intake section",
    }
  );
}
