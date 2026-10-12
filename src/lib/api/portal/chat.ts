/** Chat API: patient conversations (backend/apps/messaging). One thread per kind. */
import { apiGet, apiPost } from "./client";

export type ConversationKind = "doctor" | "support";
export type ConversationState =
  | "awaiting_staff"
  | "awaiting_doctor"
  | "awaiting_patient"
  | "closed";
export type SenderRole =
  | "patient"
  | "doctor"
  | "customer_success"
  | "support"
  | "system";
export type DeliveryStatus = "queued" | "delivered" | "failed";

export interface Attachment {
  id: string;
  s3_key: string;
  mime: string;
  size: number;
  created_at: string;
}

export interface Message {
  id: string;
  direction: "in" | "out";
  sender_role: SenderRole;
  sender_display_name: string;
  body: string;
  delivery_status: DeliveryStatus;
  attachments: Attachment[];
  created_at: string;
}

export interface Conversation {
  id: string;
  kind: ConversationKind;
  state: ConversationState;
  last_message_at: string | null;
  unread_for_patient: boolean;
  messages: Message[];
  created_at: string;
}

export interface AttachmentInput {
  s3_key: string;
  mime: string;
  size: number;
}

export interface UploadUrl {
  upload_url: string;
  fields: Record<string, string>;
}

export function listConversations(): Promise<Conversation[]> {
  return apiGet<Conversation[]>("/messaging/conversations/");
}

/** Fetches the full thread. The server marks it read as a side effect. */
export function getConversation(id: string): Promise<Conversation> {
  return apiGet<Conversation>(
    `/messaging/conversations/${encodeURIComponent(id)}/`,
  );
}

export function sendMessage(
  id: string,
  body: string,
  attachments: AttachmentInput[] = [],
): Promise<Message> {
  return apiPost<Message>(
    `/messaging/conversations/${encodeURIComponent(id)}/send_message/`,
    { body, attachments },
  );
}

export function markAllRead(): Promise<{ status: string }> {
  return apiPost<{ status: string }>("/messaging/conversations/mark_read/");
}

/** Stub on the server: returns a placeholder upload target. */
export function requestUploadUrl(id: string): Promise<UploadUrl> {
  return apiPost<UploadUrl>(
    `/messaging/conversations/${encodeURIComponent(id)}/upload_url/`,
  );
}

/** Whether the paperclip is shown. The server upload URL is a stub until storage is wired. */
export const ATTACHMENTS_ENABLED =
  import.meta.env?.VITE_PORTAL_CHAT_ATTACHMENTS === "true";

/**
 * Uploads a file to the presigned target from `requestUploadUrl` (S3 POST shape).
 * Returns the object key to reference in `sendMessage`. Throws when the upload fails.
 */
export async function uploadToPresigned(
  target: UploadUrl,
  file: File,
): Promise<string> {
  const key = target.fields.key;
  if (!key) throw new Error("Upload target is missing a key");
  const form = new FormData();
  for (const [k, v] of Object.entries(target.fields)) form.append(k, v);
  form.append("Content-Type", file.type);
  form.append("file", file);
  let res: Response;
  try {
    res = await fetch(target.upload_url, { method: "POST", body: form });
  } catch {
    throw new Error("Upload failed");
  }
  if (!res.ok) throw new Error("Upload failed");
  return key;
}
