import type { LucideIcon } from "lucide-react";
import {
  BadgeDollarSign,
  CheckCircle2,
  Clock,
  Factory,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { dualCompoundedShortPricingLine } from "@/lib/medication-pricing";

/**
 * Canonical, honest trust claims — single source of truth for header,
 * footer, homepage, and waitlist trust rows. No invented credentials,
 * certifications, or review scores: only claims that are true today.
 * LegitScript is deliberately absent — certification hasn't started yet.
 */
export type TrustSignal = {
  icon: LucideIcon;
  label: string;
  detail: string;
};

export const TRUST_SIGNALS: TrustSignal[] = [
  {
    icon: ShieldCheck,
    label: "HIPAA-compliant & encrypted",
    detail: "Every intake and message is encrypted, end to end.",
  },
  {
    icon: CheckCircle2,
    label: "Licensed providers, verified per state",
    detail:
      "Every prescriber is licensed and verified in the state you're treated in.",
  },
  {
    icon: MapPin,
    label: "Available in all 50 states",
    detail:
      "Beema Health serves patients nationwide, subject to your state's requirements and clinical eligibility.",
  },
  {
    icon: BadgeDollarSign,
    label: "Transparent pricing",
    detail: `No hidden fees, no bait-and-switch. All of our products have clear, honest, and transparent pricing.`,
  },
  {
    icon: Factory,
    label: "USA 503A pharmacies",
    detail:
      "Medication is compounded and shipped from licensed USA pharmacies.",
  },
];
