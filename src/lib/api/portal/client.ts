/**
 * Patient portal API client (Django DRF, session cookie auth).
 *
 * Every portal call goes through this module. Rules:
 * - JSON only, `credentials: "include"`, base URL from VITE_PORTAL_API_URL.
 * - CSRF token is fetched from GET /auth/csrf/ and echoed in X-CSRFToken on
 *   unsafe methods. The token is held in memory only.
 * - Nothing (tokens, profile data, request or response bodies) is written to
 *   browser storage or logs.
 * - A 401 invokes the handler registered with `setUnauthorizedHandler`.
 */

const DEFAULT_BASE = "http://localhost:8001/api/v1";

/** Base URL without a trailing slash. */
export function getPortalApiBase(): string {
  const raw =
    (import.meta.env?.VITE_PORTAL_API_URL as string | undefined) ||
    DEFAULT_BASE;
  return raw.replace(/\/+$/, "");
}

export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: FieldErrors;

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors: FieldErrors = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

const GENERIC_MESSAGE = "Something went wrong. Please try again.";
const NETWORK_MESSAGE =
  "We could not reach the server. Check your connection and try again.";

let csrfToken: string | null = null;
let csrfInflight: Promise<string> | null = null;
let unauthorizedHandler: (() => void) | null = null;

/** Registers the callback fired on any 401 response (the portal routes to /portal/login). */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

/** Test helper: drops the cached CSRF token and handler. */
export function resetPortalClient(): void {
  csrfToken = null;
  csrfInflight = null;
  unauthorizedHandler = null;
}

function url(path: string): string {
  return `${getPortalApiBase()}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Ensures a CSRF token is available (fetched once, deduplicated while in flight). */
export async function ensureCsrf(force = false): Promise<string> {
  if (!force && csrfToken) return csrfToken;
  if (!force && csrfInflight) return csrfInflight;
  csrfInflight = (async () => {
    let res: Response;
    try {
      res = await fetch(url("/auth/csrf/"), {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
    } catch {
      throw new ApiError(0, "network_error", NETWORK_MESSAGE);
    }
    if (!res.ok)
      throw new ApiError(res.status, "csrf_unavailable", GENERIC_MESSAGE);
    const data = (await res.json().catch(() => null)) as {
      csrfToken?: string;
    } | null;
    if (!data?.csrfToken)
      throw new ApiError(res.status, "csrf_unavailable", GENERIC_MESSAGE);
    csrfToken = data.csrfToken;
    return csrfToken;
  })().finally(() => {
    csrfInflight = null;
  });
  return csrfInflight;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function toStrings(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (Array.isArray(v))
    return v.filter((x): x is string => typeof x === "string");
  return [];
}

/** Maps a DRF error body to a typed ApiError. Never echoes request data. */
export function parseError(status: number, body: unknown): ApiError {
  let message = GENERIC_MESSAGE;
  let code = `http_${status}`;
  const fieldErrors: FieldErrors = {};
  if (isRecord(body)) {
    if (typeof body.detail === "string" && body.detail) message = body.detail;
    if (typeof body.code === "string" && body.code) code = body.code;
    // Questionnaire endpoints return `{ error: { code, message } }`.
    if (isRecord(body.error)) {
      if (typeof body.error.message === "string" && body.error.message)
        message = body.error.message;
      if (typeof body.error.code === "string" && body.error.code)
        code = body.error.code;
    }
    for (const [key, val] of Object.entries(body)) {
      if (key === "detail" || key === "code" || key === "error") continue;
      const msgs = toStrings(val);
      if (msgs.length) fieldErrors[key] = msgs;
    }
    if (message === GENERIC_MESSAGE && status === 400) {
      const first = Object.values(fieldErrors)[0]?.[0];
      if (first) message = first;
    }
  }
  if (status === 401 && message === GENERIC_MESSAGE)
    message = "Please sign in to continue.";
  if (status === 403 && message === GENERIC_MESSAGE)
    message = "You do not have access to this.";
  if (status === 404 && message === GENERIC_MESSAGE)
    message = "We could not find that.";
  if (status === 429) {
    message = "Too many attempts. Please wait a moment and try again.";
    code = "throttled";
  }
  return new ApiError(status, code, message, fieldErrors);
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

async function request<T>(
  method: Method,
  path: string,
  body?: unknown,
  retriedCsrf = false,
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const init: RequestInit = { method, credentials: "include", headers };
  if (method !== "GET") {
    headers["X-CSRFToken"] = await ensureCsrf();
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }
  }
  let res: Response;
  try {
    res = await fetch(url(path), init);
  } catch {
    throw new ApiError(0, "network_error", NETWORK_MESSAGE);
  }
  if (res.status === 204) return undefined as T;
  const parsed: unknown = await res.json().catch(() => null);
  if (res.ok) return parsed as T;

  const err = parseError(res.status, parsed);
  // A stale CSRF token surfaces as 403 once; refresh and retry a single time.
  if (
    res.status === 403 &&
    method !== "GET" &&
    !retriedCsrf &&
    /csrf/i.test(err.message)
  ) {
    await ensureCsrf(true);
    return request<T>(method, path, body, true);
  }
  if (res.status === 401) unauthorizedHandler?.();
  throw err;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>("GET", path);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>("POST", path, body);
}

export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return request<T>("PATCH", path, body);
}

export function apiDelete(path: string): Promise<void> {
  return request<void>("DELETE", path);
}
