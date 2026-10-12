import {
  CalendarCheck,
  CreditCard,
  FileUp,
  MapPin,
  MessageCircleQuestion,
  Pill,
  RefreshCw,
  Syringe,
  Video,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";
import type { QuickAction, QuickActionKind } from "@/lib/api/portal/home";

const ICONS: Record<QuickActionKind, LucideIcon> = {
  complete_visit: Video,
  payment_failed: CreditCard,
  upload_id: FileUp,
  upload_proof: FileUp,
  book_visit: CalendarCheck,
  answer_followup: MessageCircleQuestion,
  confirm_address: MapPin,
  log_dose: Syringe,
  request_refill: RefreshCw,
};

type Props = {
  actions: QuickAction[];
  onAction: (action: QuickAction) => void;
};

/** Horizontal row of one tap shortcuts. Empty list renders nothing. */
export function QuickActions({ actions, onAction }: Props) {
  if (actions.length === 0) return null;
  return (
    <section aria-labelledby="quick-actions-heading">
      <h2
        id="quick-actions-heading"
        className="mb-3 font-display text-lg font-semibold"
      >
        Quick actions
      </h2>
      <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {actions.map((action, i) => {
          const Icon = ICONS[action.kind] ?? Pill;
          return (
            <motion.li
              key={`${action.kind}-${action.treatment_id ?? i}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.05 * i,
                duration: 0.3,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="shrink-0"
            >
              <button
                type="button"
                onClick={() => onAction(action)}
                className="group inline-flex items-center gap-2.5 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-primary-soft text-primary-foreground/90 transition-colors group-hover:bg-primary">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                {action.label}
              </button>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
