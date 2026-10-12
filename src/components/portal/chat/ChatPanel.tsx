import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Stethoscope, LifeBuoy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { listConversations, type Conversation } from "@/lib/api/portal/chat";
import { cn } from "@/lib/utils";
import { EmptyState, ErrorState, LoadingBlock } from "../PortalStates";
import { formatDate } from "../portal-format";
import { chatKeys } from "../query-keys";
import { ChatThread } from "./ChatThread";
import { kindLabel, previewOf, sortThreads, stateLabel } from "./chat-model";

export function ThreadRow({
  conversation,
  active,
  onSelect,
}: {
  conversation: Conversation;
  active: boolean;
  onSelect: () => void;
}) {
  const label = kindLabel(conversation.kind);
  const Icon = conversation.kind === "doctor" ? Stethoscope : LifeBuoy;
  return (
    <li className="list-none">
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "true" : undefined}
        className={cn(
          "flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          active
            ? "border-primary/50 bg-primary-soft"
            : "border-border bg-card hover:bg-muted",
        )}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "font-display text-base",
                conversation.unread_for_patient ? "font-bold" : "font-semibold",
              )}
            >
              {label.title}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDate(conversation.last_message_at)}
            </span>
          </span>
          <span className="block truncate text-sm text-muted-foreground">
            {previewOf(conversation)}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {stateLabel(conversation.state)}
          </span>
        </span>
        {conversation.unread_for_patient && (
          <span
            className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary"
            role="img"
            aria-label="Unread messages"
          />
        )}
      </button>
    </li>
  );
}

export function ChatPanel() {
  const list = useQuery({
    queryKey: chatKeys.list,
    queryFn: listConversations,
    refetchInterval: 30_000,
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [mobileThread, setMobileThread] = useState(false);

  const threads = useMemo(
    () => (list.data ? sortThreads(list.data) : []),
    [list.data],
  );
  useEffect(() => {
    if (!selected && threads.length > 0) setSelected(threads[0].id);
  }, [selected, threads]);

  if (list.isPending)
    return <LoadingBlock rows={2} label="Loading conversations" />;
  if (list.isError)
    return (
      <ErrorState error={list.error} onRetry={() => void list.refetch()} />
    );
  if (threads.length === 0) {
    return (
      <EmptyState
        icon={MessageCircle}
        title="No conversations yet"
        body="Your care team and support threads open here once your treatment begins."
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-[18rem_1fr] md:items-stretch">
      <nav
        aria-label="Conversations"
        className={cn(mobileThread && "hidden md:block")}
      >
        <ul className="grid gap-2">
          {threads.map((c) => (
            <ThreadRow
              key={c.id}
              conversation={c}
              active={c.id === selected}
              onSelect={() => {
                setSelected(c.id);
                setMobileThread(true);
              }}
            />
          ))}
        </ul>
      </nav>
      <div className={cn("min-w-0", !mobileThread && "hidden md:block")}>
        {selected && (
          <ChatThread
            key={selected}
            conversationId={selected}
            onBack={() => setMobileThread(false)}
          />
        )}
      </div>
    </div>
  );
}
