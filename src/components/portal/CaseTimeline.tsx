import type { CareTimelineEvent } from "@/lib/dashboard-status";
import { cn } from "@/lib/utils";

const toneDot = {
  blue: "bg-secondary",
  green: "bg-success",
  orange: "bg-warning",
  gray: "bg-muted-foreground/40",
} as const;

export function CaseTimeline({ events }: { events: CareTimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Your case timeline will appear here after you submit your intake.
      </p>
    );
  }

  return (
    <ol className="relative space-y-6 border-l border-border pl-6">
      {events.map((event, index) => (
        <li key={event.id} className="relative">
          <span
            className={cn(
              "absolute -left-[1.6rem] top-1 size-2.5 rounded-full ring-4 ring-card",
              toneDot[event.tone],
            )}
            aria-hidden
          />
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-medium text-foreground">{event.title}</p>
            <time className="text-xs text-muted-foreground">
              {new Date(event.timestamp).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </time>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {event.description}
          </p>
          {index < events.length - 1 && null}
        </li>
      ))}
    </ol>
  );
}
