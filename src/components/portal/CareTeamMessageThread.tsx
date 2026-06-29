import { MessageSquare, Stethoscope, UserRound } from "lucide-react";
import type { CareTeamMessage } from "@/lib/care-team-messages";
import { parseCareTeamMessages } from "@/lib/care-team-messages";
import { cn } from "@/lib/utils";

const SENDER_STYLES = {
  provider: {
    icon: Stethoscope,
    bubble: "border-secondary/20 bg-secondary/8",
    badge: "bg-secondary/12 text-secondary",
  },
  support: {
    icon: UserRound,
    bubble: "border-accent-foreground/12 bg-accent/25",
    badge: "bg-accent-foreground/10 text-accent-foreground",
  },
  care_team: {
    icon: MessageSquare,
    bubble: "border-border bg-muted/50",
    badge: "bg-muted text-foreground/80",
  },
} as const;

function CareTeamMessageBubble({ message }: { message: CareTeamMessage }) {
  const styles = SENDER_STYLES[message.sender];
  const Icon = styles.icon;

  return (
    <article className="flex gap-3">
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
          styles.badge,
        )}
        aria-hidden
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold text-foreground">
            {message.senderLabel}
          </p>
        </div>
        <div
          className={cn(
            "mt-1.5 rounded-2xl rounded-tl-md border px-3.5 py-2.5 text-sm leading-relaxed text-foreground",
            styles.bubble,
          )}
        >
          {message.body}
        </div>
      </div>
    </article>
  );
}

export function CareTeamMessageThread({
  patientNote,
  className,
  emptyMessage = "No messages from your care team yet. We will notify you here when your provider or support team reaches out.",
}: {
  patientNote: string;
  className?: string;
  emptyMessage?: string;
}) {
  const messages = parseCareTeamMessages(patientNote);

  if (messages.length === 0) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-dashed border-border/80 bg-muted/40 px-4 py-5 text-center",
          className,
        )}
      >
        <MessageSquare
          className="mx-auto size-5 text-muted-foreground"
          aria-hidden
        />
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {messages.map((message) => (
        <CareTeamMessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}
