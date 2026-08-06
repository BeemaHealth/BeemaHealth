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
    detail: "End-to-end encrypted, always.",
  },
  {
    icon: CheckCircle2,
    label: "Licensed providers, verified per state",
    detail: "Verified in your state.",
  },
  {
    icon: MapPin,
    label: "Available in all 50 states",
    detail: "Nationwide, per state eligibility.",
  },
  {
    icon: BadgeDollarSign,
    label: "Transparent pricing",
    detail: "No hidden fees, ever.",
  },
  {
    icon: Factory,
    label: "USA 503A pharmacies",
    detail: "Compounded in licensed U.S. pharmacies.",
  },
];
