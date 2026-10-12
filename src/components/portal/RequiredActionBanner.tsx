import { AlertTriangle, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { NOTICE_BANNER_STYLES } from "@/lib/design-tokens";
import type { ActionItem } from "@/lib/api/portal/home";
import { cn } from "@/lib/utils";

type Props = {
  items: ActionItem[];
  onAction: (item: ActionItem) => void;
};

/** Required action banner listing every open ActionItem. Renders nothing when there are none. */
export function RequiredActionBanner({ items, onAction }: Props) {
  const open = items.filter((i) => i.is_open);
  if (open.length === 0) return null;
  return (
    <motion.section
      aria-labelledby="required-action-heading"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "rounded-3xl border p-5 shadow-soft sm:p-6",
        NOTICE_BANNER_STYLES.warning,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-warning/25 text-warning-foreground">
          <AlertTriangle className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2
            id="required-action-heading"
            className="font-display text-lg font-semibold"
          >
            Required action
          </h2>
          <p className="text-sm text-muted-foreground">
            {open.length === 1
              ? "One step needs your attention."
              : `${open.length} steps need your attention.`}
          </p>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {open.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onAction(item)}
              className="group flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-3 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  {item.title}
                </span>
                {item.body && (
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {item.body}
                  </span>
                )}
              </span>
              <ArrowRight
                className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </button>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}
