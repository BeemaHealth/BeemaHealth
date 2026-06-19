import type { CareTimelineEvent } from "@/lib/dashboard-status";
import { cn } from "@/lib/utils";

const toneStyles = {
  blue: {
    dot: "bg-secondary",
    badge: "border-secondary/20 bg-secondary/12 text-secondary",
  },
  green: {
    dot: "bg-success",
    badge: "border-success/20 bg-success/12 text-success",
  },
  orange: {
    dot: "bg-warning",
    badge: "border-warning/25 bg-warning/20 text-warning-foreground",
  },
  gray: {
    dot: "bg-muted-foreground/45",
    badge: "border-border bg-muted text-muted-foreground",
  },
} as const;

function formatTimelineDate(timestamp: string) {
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function CaseTimeline({ events }: { events: CareTimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Your case timeline will appear here after you submit your intake.
      </p>
    );
  }

  return (
    <ol className="relative space-y-6 border-l border-border/80 pl-6">
      {events.map((event) => {
        const styles = toneStyles[event.tone];

        return (
          <li key={event.id} className="relative">
            <span
              className={cn(
                "absolute -left-[1.6rem] top-1 size-2.5 rounded-full ring-4 ring-card",
                styles.dot,
              )}
              aria-hidden
            />
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium text-foreground">{event.title}</p>
              <time
                dateTime={event.timestamp}
                className={cn(
                  "rounded-lg border px-2 py-0.5 text-xs font-medium",
                  styles.badge,
                )}
              >
                {formatTimelineDate(event.timestamp)}
              </time>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {event.description}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
