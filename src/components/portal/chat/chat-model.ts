import type {
  AttachmentInput,
  Conversation,
  ConversationKind,
  Message,
  SenderRole,
} from "@/lib/api/portal/chat";

export const MAX_MESSAGE_LENGTH = 5000;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const ALLOWED_ATTACHMENT_MIME = [
  "image/jpeg",
  "image/png",
  "application/pdf",
] as const;

const ROLE_LABELS: Record<SenderRole, string> = {
  patient: "You",
  doctor: "Doctor",
  customer_success: "Customer Success Manager",
  support: "Support",
  system: "Beema Health",
};

export function roleLabel(role: SenderRole): string {
  return ROLE_LABELS[role] ?? "Support";
}

export const KIND_LABELS: Record<
  ConversationKind,
  { title: string; blurb: string }
> = {
  doctor: { title: "Doctor", blurb: "Questions about your treatment" },
  support: { title: "Support", blurb: "Orders, billing and your account" },
};

export function kindLabel(kind: ConversationKind): {
  title: string;
  blurb: string;
} {
  return KIND_LABELS[kind] ?? KIND_LABELS.support;
}

/** One thread per kind, doctor first. */
export function sortThreads(list: Conversation[]): Conversation[] {
  const order: Record<string, number> = { doctor: 0, support: 1 };
  return [...list].sort((a, b) => (order[a.kind] ?? 9) - (order[b.kind] ?? 9));
}

export function unreadCount(list: Conversation[]): number {
  return list.filter((c) => c.unread_for_patient).length;
}

export function validateBody(
  raw: string,
): { ok: true; body: string } | { ok: false; error: string } {
  const body = raw.trim();
  if (!body) return { ok: false, error: "Write a message first." };
  if (body.length > MAX_MESSAGE_LENGTH)
    return {
      ok: false,
      error: `Messages can be up to ${MAX_MESSAGE_LENGTH} characters.`,
    };
  return { ok: true, body };
}

export function validateAttachment(file: {
  name: string;
  type: string;
  size: number;
}): string | null {
  if (!(ALLOWED_ATTACHMENT_MIME as readonly string[]).includes(file.type))
    return "Attach a JPG, PNG or PDF file.";
  if (file.size <= 0) return "That file is empty.";
  if (file.size > MAX_ATTACHMENT_BYTES) return "Files can be up to 10 MB.";
  return null;
}

export function toAttachmentInput(
  s3Key: string,
  file: { type: string; size: number },
): AttachmentInput {
  return { s3_key: s3Key, mime: file.type, size: file.size };
}

/** A message the patient sent that the server has not confirmed yet. */
export interface PendingMessage {
  localId: string;
  body: string;
  createdAt: string;
  status: "sending" | "failed";
}

export type ThreadItem =
  | { kind: "server"; key: string; message: Message }
  | { kind: "pending"; key: string; pending: PendingMessage };

/** Server messages oldest first, then optimistic ones. */
export function buildThreadItems(
  messages: Message[],
  pending: PendingMessage[],
): ThreadItem[] {
  const server = [...messages]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map<ThreadItem>((m) => ({ kind: "server", key: m.id, message: m }));
  const local = pending.map<ThreadItem>((p) => ({
    kind: "pending",
    key: p.localId,
    pending: p,
  }));
  return [...server, ...local];
}

export function isOwn(m: Message): boolean {
  return m.sender_role === "patient";
}

export function stateLabel(state: Conversation["state"]): string {
  switch (state) {
    case "awaiting_patient":
      return "Waiting for your reply";
    case "awaiting_staff":
    case "awaiting_doctor":
      return "We will reply soon";
    case "closed":
      return "Closed";
  }
}

export function previewOf(c: Conversation): string {
  const last = c.messages[c.messages.length - 1];
  if (!last) return "No messages yet";
  const text = last.body.replace(/\s+/g, " ").trim();
  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
}
