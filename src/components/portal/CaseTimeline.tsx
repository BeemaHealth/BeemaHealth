import { useState } from "react";
import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  buildGroupedCareTimeline,
  type CareTimelineEvent,
  type CareTimelineGroup,
} from "@/lib/dashboard-status";
import { TIMELINE_TONE_STYLES } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { IntakeStatus, PersistedCareEvent } from "@/lib/types/mvp";

function formatTimelineDate(timestamp: string) {
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function EventList({ events }: { events: CareTimelineEvent[] }) {
  if (events.length === 0) return null;
  return (
    <ol className="relative space-y-5 border-l border-border/80 pl-6">
      {events.map((event) => {
        const styles = TIMELINE_TONE_STYLES[event.tone];
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

function GroupSection({
  group,
  isOpen,
  onToggle,
}: {
  group: CareTimelineGroup;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className="flex items-center gap-2">
          <ChevronRight
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-90",
            )}
            aria-hidden
          />
          <span className="text-sm font-semibold text-foreground">
            {group.label}
          </span>
          {!group.isInitial && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              Refill
            </span>
          )}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {group.dateLabel}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pb-2 pl-3 pt-3">
          <EventList events={group.events} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function CaseTimeline({
  intakeStatus,
  submittedAt,
  careEvents,
  className,
}: {
  intakeStatus: IntakeStatus;
  submittedAt: string | null;
  careEvents: PersistedCareEvent[];
  className?: string;
}) {
  const groups = buildGroupedCareTimeline(
    intakeStatus,
    submittedAt,
    careEvents,
  );

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (groups.length > 0) initial.add(groups[groups.length - 1].id);
    return initial;
  });

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Your case timeline will appear here after you submit your intake.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "space-y-1 overflow-y-auto pr-1",
        className ?? "max-h-[32rem]",
      )}
      aria-label="Case timeline"
    >
      {groups.map((group) => (
        <GroupSection
          key={group.id}
          group={group}
          isOpen={openGroups.has(group.id)}
          onToggle={() => toggleGroup(group.id)}
        />
      ))}
    </div>
  );
}
