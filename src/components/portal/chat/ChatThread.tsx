import { chatKeys } from "../query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Paperclip, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ATTACHMENTS_ENABLED,
  getConversation,
  requestUploadUrl,
  sendMessage,
  uploadToPresigned,
  type AttachmentInput,
  type Conversation,
} from "@/lib/api/portal/chat";
import {
  EmptyState,
  ErrorState,
  InlineError,
  LoadingBlock,
} from "../PortalStates";
import { errorMessage } from "../portal-errors";
import { MessageBubble, PendingBubble } from "./MessageBubble";
import {
  MAX_MESSAGE_LENGTH,
  buildThreadItems,
  kindLabel,
  stateLabel,
  toAttachmentInput,
  validateAttachment,
  validateBody,
  type PendingMessage,
} from "./chat-model";

let localCounter = 0;
const newLocalId = () => `local-${Date.now()}-${++localCounter}`;

export function ChatThread({
  conversationId,
  onBack,
}: {
  conversationId: string;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const thread = useQuery({
    queryKey: chatKeys.thread(conversationId),
    queryFn: () => getConversation(conversationId),
  });
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const endRef = useRef<HTMLLIElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Opening a thread marks it read on the server; refresh the list badge.
  useEffect(() => {
    if (thread.isSuccess)
      void qc.invalidateQueries({ queryKey: chatKeys.list });
  }, [thread.isSuccess, thread.dataUpdatedAt, qc]);

  useEffect(() => {
    setPending([]);
    setDraft("");
    setFile(null);
    setFormError(null);
  }, [conversationId]);

  const itemsCount = (thread.data?.messages.length ?? 0) + pending.length;
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [itemsCount]);

  const send = useMutation({
    mutationFn: async (v: {
      local: PendingMessage;
      attachment: File | null;
    }) => {
      let attachments: AttachmentInput[] = [];
      if (v.attachment) {
        const target = await requestUploadUrl(conversationId);
        const key = await uploadToPresigned(target, v.attachment);
        attachments = [toAttachmentInput(key, v.attachment)];
      }
      return sendMessage(conversationId, v.local.body, attachments);
    },
    onSuccess: (message, v) => {
      qc.setQueryData<Conversation>(chatKeys.thread(conversationId), (old) =>
        old && !old.messages.some((m) => m.id === message.id)
          ? { ...old, messages: [...old.messages, message] }
          : old,
      );
      setPending((p) => p.filter((x) => x.localId !== v.local.localId));
      void qc.invalidateQueries({ queryKey: chatKeys.list });
    },
    onError: (_e, v) => {
      setPending((p) =>
        p.map((x) =>
          x.localId === v.local.localId ? { ...x, status: "failed" } : x,
        ),
      );
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const check = validateBody(draft);
    if (!check.ok) {
      setFormError(check.error);
      return;
    }
    setFormError(null);
    const local: PendingMessage = {
      localId: newLocalId(),
      body: check.body,
      createdAt: new Date().toISOString(),
      status: "sending",
    };
    setPending((p) => [...p, local]);
    send.mutate({ local, attachment: file });
    setDraft("");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function retry(p: PendingMessage) {
    setPending((list) =>
      list.map((x) =>
        x.localId === p.localId ? { ...x, status: "sending" } : x,
      ),
    );
    send.mutate({ local: { ...p, status: "sending" }, attachment: null });
  }

  function pickFile(f: File | undefined) {
    if (!f) return;
    const problem = validateAttachment(f);
    if (problem) {
      setFormError(problem);
      return;
    }
    setFormError(null);
    setFile(f);
  }

  const title = thread.data
    ? kindLabel(thread.data.kind).title
    : "Conversation";

  return (
    <section
      aria-label={`${title} conversation`}
      className="flex h-full min-h-[28rem] flex-col rounded-3xl border border-border bg-card shadow-soft"
    >
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onBack}
          aria-label="Back to conversations"
        >
          <ArrowLeft />
        </Button>
        <div>
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {thread.data && (
            <p className="text-xs text-muted-foreground">
              {stateLabel(thread.data.state)}
            </p>
          )}
        </div>
      </header>

      <div
        className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
        aria-live="polite"
      >
        {thread.isPending && <LoadingBlock rows={3} label="Loading messages" />}
        {thread.isError && (
          <ErrorState
            error={thread.error}
            onRetry={() => void thread.refetch()}
          />
        )}
        {thread.isSuccess &&
          thread.data.messages.length === 0 &&
          pending.length === 0 && (
            <EmptyState
              title="Say hello"
              body={`Send a message to start your ${title.toLowerCase()} conversation.`}
            />
          )}
        {thread.isSuccess && (
          <ul className="grid gap-4">
            {buildThreadItems(thread.data.messages, pending).map((item) =>
              item.kind === "server" ? (
                <MessageBubble key={item.key} message={item.message} />
              ) : (
                <PendingBubble
                  key={item.key}
                  pending={item.pending}
                  onRetry={retry}
                  onDiscard={(p) =>
                    setPending((list) =>
                      list.filter((x) => x.localId !== p.localId),
                    )
                  }
                />
              ),
            )}
            <li ref={endRef} aria-hidden="true" className="list-none" />
          </ul>
        )}
      </div>

      <form
        onSubmit={submit}
        className="grid gap-2 border-t border-border p-3"
        noValidate
      >
        {file && (
          <div className="flex w-fit items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs">
            <Paperclip className="size-3" aria-hidden="true" />
            {file.name}
            <button
              type="button"
              aria-label="Remove attachment"
              onClick={() => setFile(null)}
            >
              <X className="size-3" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          {ATTACHMENTS_ENABLED && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Attach a file"
                onClick={() => fileRef.current?.click()}
              >
                <Paperclip />
              </Button>
            </>
          )}
          <label htmlFor="chat-draft" className="sr-only">
            Message
          </label>
          <Textarea
            id="chat-draft"
            rows={1}
            value={draft}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder="Write a message"
            className="max-h-40 min-h-10 flex-1 resize-none rounded-2xl"
            aria-invalid={!!formError}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Send message"
            disabled={!draft.trim()}
          >
            <Send />
          </Button>
        </div>
        <InlineError message={formError} />
        {send.isError && !formError && (
          <p className="sr-only">{errorMessage(send.error)}</p>
        )}
      </form>
    </section>
  );
}
