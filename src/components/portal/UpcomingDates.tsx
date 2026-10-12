import { CalendarClock, Syringe, Video } from "lucide-react";
import { motion } from "motion/react";
import {
  formatShortDate,
  formatTime,
  type UpcomingDates as Upcoming,
} from "@/lib/api/portal/home";
import { STATUS_BADGE_STYLES } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

type Props = { upcoming: Upcoming; timeZone?: string };

/** Next dose and next visit cards, with an overdue dose callout. */
export function UpcomingDates({ upcoming, timeZone }: Props) {
  const cards = [
    {
      key: "dose",
      label: "Next dose",
      at: upcoming.next_dose_at,
      Icon: Syringe,
      empty: "No dose scheduled yet.",
    },
    {
      key: "visit",
      label: "Next visit",
      at: upcoming.next_visit_at,
      Icon: Video,
      empty: "No visit scheduled.",
    },
  ];
  return (
    <section aria-labelledby="upcoming-heading">
      <h2
        id="upcoming-heading"
        className="mb-3 font-display text-lg font-semibold"
      >
        Upcoming dates
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map(({ key, label, at, Icon, empty }, i) => {
          const date = formatShortDate(at, timeZone);
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -3 }}
              transition={{
                delay: 0.06 * i,
                duration: 0.32,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="rounded-3xl border border-border bg-card p-5 shadow-soft"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-primary-soft text-primary-foreground/90">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <p className="text-sm font-medium text-muted-foreground">
                  {label}
                </p>
              </div>
              {date ? (
                <p className="mt-4 font-display text-2xl font-semibold tracking-tight">
                  {date}
                  <span className="ml-2 text-base font-normal text-muted-foreground">
                    {formatTime(at, timeZone)}
                  </span>
                </p>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">{empty}</p>
              )}
            </motion.div>
          );
        })}
      </div>
      {upcoming.overdue_doses > 0 && (
        <p
          role="status"
          className={cn(
            "mt-4 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium",
            STATUS_BADGE_STYLES.warning.badge,
          )}
        >
          <CalendarClock className="size-4" aria-hidden="true" />
          {upcoming.overdue_doses === 1
            ? "1 dose is overdue. Log it from Shots."
            : `${upcoming.overdue_doses} doses are overdue. Log them from Shots.`}
        </p>
      )}
    </section>
  );
}
