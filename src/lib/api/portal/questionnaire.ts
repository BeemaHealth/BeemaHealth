/**
 * Server-driven questionnaire API (Django `questionnaires` + the auth endpoints the
 * `auth` node needs). The server decides the next node; the client only submits the
 * current node's answer and renders whatever comes back. Answers are never stored in
 * the browser, so a refresh resumes from `GET /current`.
 */

import { ApiError, apiGet, apiPost } from "./client";

export type NodeType =
  | "radio"
  | "multi_select"
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "empty_page"
  | "auth"
  | "basics"
  | "bmi"
  | "safety_consent"
  | "allergies"
  | "add_medication"
  | "med_conditions"
  | "file_input"
  | "id_photo"
  | "checkout"
  | "no_proceed"
  | "thank_you";

export type NodeOption = {
  key: string;
  label: string;
  description?: string;
  exclusive?: boolean;
};

/** Public node shape returned by `describe()` (routing internals are stripped server side). */
export type QuestionnaireNode = {
  id: string;
  type: NodeType;
  title?: string;
  body?: string;
  icon?: string;
  options?: NodeOption[];
  optional?: boolean;
  min_select?: number;
  max_select?: number;
  format?: "email" | "zip";
  min_length?: number;
  max_length?: number;
  min?: number;
  max?: number;
  integer?: boolean;
  min_age?: number;
  not_future?: boolean;
  statement?: string;
  consent_kind?: string;
  file_kind?: string;
  max_files?: number;
  required?: boolean;
  plan_slugs?: string[];
  collect_email?: boolean;
  min_bmi?: number;
  button_label?: string;
  placeholder?: string;
  suffix?: string;
};

export type NodeTypeLayout = {
  align?: "center" | "left";
  icon?: string;
  button_label?: string;
  auto_advance?: boolean;
  max_width?: string;
};

export type LayoutConfig = {
  shell?: { max_width?: string; show_header?: boolean; show_footer?: boolean };
  progress?: { style?: string; show_percent?: boolean };
  back_button?: { enabled?: boolean; hidden_on_node_types?: string[] };
  header?: { show_save_and_exit?: boolean };
  footer?: {
    legal_text?: string;
    privacy_text?: string;
    links?: Array<{ label: string; href: string }>;
  };
  copy?: Partial<
    Record<
      "continue" | "back" | "saving" | "error_generic" | "upload_hint",
      string
    >
  >;
  node_types?: Partial<Record<NodeType, NodeTypeLayout>>;
};

export type SubmissionStatus =
  | "in_progress"
  | "submitted"
  | "disqualified"
  | string;

export type SubmissionView = {
  submission_id: string;
  status: SubmissionStatus;
  node: QuestionnaireNode;
  path: string[];
  progress: number;
  layout: LayoutConfig;
  claimed: boolean;
  previous_answer: unknown;
  disqualify_reason?: string;
};

export type UploadTicket = {
  file_id: string;
  upload: { url: string; fields: Record<string, string> };
};

const BASE = "/questionnaires";

export function startQuestionnaire(
  slug: string,
  utm?: Record<string, string | undefined>,
): Promise<SubmissionView> {
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(utm ?? {})) {
    if (typeof v === "string" && v) clean[k] = v.slice(0, 100);
  }
  return apiPost<SubmissionView>(`${BASE}/start/`, {
    questionnaire: slug,
    ...(Object.keys(clean).length ? { utm: clean } : {}),
  });
}

/** The in-progress submission, or null when none exists (the API answers 204). */
export function getCurrent(): Promise<SubmissionView | null> {
  return apiGet<SubmissionView | null>(`${BASE}/current/`);
}

export function submitAnswer(
  nodeId: string,
  value: unknown,
): Promise<SubmissionView> {
  return apiPost<SubmissionView>(`${BASE}/answer/`, { node_id: nodeId, value });
}

export function goBack(): Promise<SubmissionView> {
  return apiPost<SubmissionView>(`${BASE}/back/`, {});
}

export function claimSubmission(): Promise<SubmissionView> {
  return apiPost<SubmissionView>(`${BASE}/claim/`, {});
}

/** Loads the current submission, starting a new one when none is in progress. */
export async function resumeOrStart(
  slug: string,
  utm?: Record<string, string | undefined>,
): Promise<SubmissionView> {
  return (await getCurrent()) ?? startQuestionnaire(slug, utm);
}

export function requestUpload(
  kind: string,
  contentType: string,
  sizeBytes: number,
): Promise<UploadTicket> {
  return apiPost<UploadTicket>(`${BASE}/upload-url/`, {
    kind,
    content_type: contentType,
    size_bytes: sizeBytes,
  });
}

/** Sends the file straight to the presigned S3 POST. Bytes never pass through the API. */
export async function uploadToStorage(
  ticket: UploadTicket,
  file: File,
): Promise<void> {
  const form = new FormData();
  for (const [k, v] of Object.entries(ticket.upload.fields)) form.append(k, v);
  form.append("file", file);
  let res: Response;
  try {
    res = await fetch(ticket.upload.url, { method: "POST", body: form });
  } catch {
    throw new ApiError(
      0,
      "upload_failed",
      "The upload did not finish. Check your connection and try again.",
    );
  }
  if (!res.ok) {
    throw new ApiError(
      res.status,
      "upload_failed",
      "The upload did not finish. Please try again.",
    );
  }
}

/** Uploads one file and returns its server id, ready for a `file_ids` answer. */
export async function uploadFile(kind: string, file: File): Promise<string> {
  const ticket = await requestUpload(kind, file.type, file.size);
  await uploadToStorage(ticket, file);
  return ticket.file_id;
}

// ---- account creation for the `auth` node (passwordless email code) ----

export function requestLoginCode(email: string): Promise<{ detail: string }> {
  return apiPost<{ detail: string }>("/auth/request-link/", { email });
}

export function verifyLoginCode(email: string, code: string): Promise<unknown> {
  return apiPost<unknown>("/auth/verify/", { email, code });
}
