import {
  AlertCircle,
  Check,
  Clock,
  FileText,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import type { Message } from "@/lib/api/portal/chat";
import { cn } from "@/lib/utils";
import { formatDateTime } from "../portal-format";
import { isOwn, roleLabel, type PendingMessage } from "./chat-model";

const bubble =
  "max-w-[85%] whitespace-pre-wrap break-words rounded-3xl px-4 py-2.5 text-sm leading-relaxed sm:max-w-[75%]";

function useEnter() {
  const reduce = useReducedMotion();
  return {
    initial: reduce ? false : { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.22 },
  } as const;
}

export function MessageBubble({ message }: { message: Message }) {
  const own = isOwn(message);
  const enter = useEnter();
  const failed = message.delivery_status === "failed";
  return (
    <motion.li
      {...enter}
      className={cn(
        "flex list-none flex-col gap-1",
        own ? "items-end" : "items-start",
      )}
    >
      <span className="px-2 text-xs font-medium text-muted-foreground">
        {own
          ? "You"
          : message.sender_display_name || roleLabel(message.sender_role)}
        {!own && message.sender_display_name && (
          <span className="font-normal">
            {" "}
            · {roleLabel(message.sender_role)}
          </span>
        )}
      </span>
      <div
        className={cn(
          bubble,
          own
            ? "rounded-br-lg bg-primary text-primary-foreground"
            : "rounded-bl-lg border border-border bg-card text-foreground",
        )}
      >
        {message.body}
        {message.attachments.length > 0 && (
          <ul className="mt-2 grid gap-1">
            {message.attachments.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-1.5 text-xs opacity-90"
              >
                <FileText className="size-3.5" aria-hidden="true" />
                {a.mime.split("/")[1]?.toUpperCase() ?? "File"} attachment
              </li>
            ))}
          </ul>
        )}
      </div>
      <span className="flex items-center gap-1 px-2 text-xs text-muted-foreground">
        {formatDateTime(message.created_at)}
        {own && failed && (
          <span className="flex items-center gap-1 text-destructive">
            <AlertCircle className="size-3" aria-hidden="true" /> Not delivered
          </span>
        )}
      </span>
    </motion.li>
  );
}

export function PendingBubble({
  pending,
  onRetry,
  onDiscard,
}: {
  pending: PendingMessage;
  onRetry: (p: PendingMessage) => void;
  onDiscard: (p: PendingMessage) => void;
}) {
  const enter = useEnter();
  const failed = pending.status === "failed";
  return (
    <motion.li {...enter} className="flex list-none flex-col items-end gap-1">
      <span className="px-2 text-xs font-medium text-muted-foreground">
        You
      </span>
      <div
        className={cn(
          bubble,
          "rounded-br-lg",
          failed
            ? "border border-destructive/50 bg-destructive/10 text-foreground"
            : "bg-primary/70 text-primary-foreground",
        )}
      >
        {pending.body}
      </div>
      {failed ? (
        <div
          role="alert"
          className="flex items-center gap-2 px-2 text-xs text-destructive"
        >
          <AlertCircle className="size-3.5" aria-hidden="true" />
          Message not sent.
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onRetry(pending)}
          >
            <RotateCcw aria-hidden="true" /> Retry
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onDiscard(pending)}
          >
            <Trash2 aria-hidden="true" /> Discard
          </Button>
        </div>
      ) : (
        <span
          role="status"
          className="flex items-center gap-1 px-2 text-xs text-muted-foreground"
        >
          <Clock className="size-3" aria-hidden="true" /> Sending
          <Check className="sr-only" aria-hidden="true" />
        </span>
      )}
    </motion.li>
  );
}
