import type { DailyRow, LabState, Mode, PathRow } from "@shared/types.ts";

export class ApiError extends Error {}

async function call<T>(
  method: string,
  path: string,
  mode: Mode,
  body?: unknown,
): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  let res: Response;
  try {
    res = await fetch(`/api${path}${sep}mode=${mode}`, {
      method,
      headers: { "content-type": "application/json", "x-cro-lab": "1" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      "Cannot reach the CRO Lab server. Is `npm run cro` still running?",
    );
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new ApiError(json.error ?? `Request failed (${res.status})`);
  return json as T;
}

export const api = {
  state: (m: Mode) => call<LabState>("GET", "/state", m),
  rows: (m: Mode, refresh = false) =>
    call<{ rows: DailyRow[]; paths: PathRow[] }>(
      "GET",
      `/rows${refresh ? "?refresh=1" : ""}`,
      m,
    ),
  createVariant: (m: Mode, body: unknown) =>
    call<{ id: string; componentPath: string }>("POST", "/variants", m, body),
  patchVariant: (m: Mode, pageId: string, id: string, body: unknown) =>
    call<LabState>("PATCH", `/variants/${pageId}/${id}`, m, body),
  makeMain: (pageId: string, body: { variantId: string; goLiveAt?: string }) =>
    call<LabState>("POST", `/pages/${pageId}/main`, "live", body),
  addTest: (m: Mode, body: unknown) =>
    call<LabState>("POST", "/tests", m, body),
  patchTest: (m: Mode, id: string, body: unknown) =>
    call<LabState>("PATCH", `/tests/${id}`, m, body),
  deleteTest: (m: Mode, id: string) =>
    call<LabState>("DELETE", `/tests/${id}`, m),
  resetDemo: () => call<LabState>("POST", "/demo/reset", "demo"),
};
