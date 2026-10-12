import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  ensureCsrf,
  parseError,
  resetPortalClient,
  setUnauthorizedHandler,
} from "../client";

const BASE = "http://localhost:8001/api/v1";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  resetPortalClient();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ensureCsrf", () => {
  it("fetches the token once and caches it", async () => {
    fetchMock.mockResolvedValue(json({ csrfToken: "tok1" }));
    expect(await ensureCsrf()).toBe("tok1");
    expect(await ensureCsrf()).toBe("tok1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/auth/csrf/`);
    expect(init.credentials).toBe("include");
  });

  it("deduplicates concurrent requests", async () => {
    fetchMock.mockResolvedValue(json({ csrfToken: "tok1" }));
    await Promise.all([ensureCsrf(), ensureCsrf(), ensureCsrf()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws a typed error when the endpoint fails", async () => {
    fetchMock.mockResolvedValue(json({}, 500));
    await expect(ensureCsrf()).rejects.toMatchObject({
      status: 500,
      code: "csrf_unavailable",
    });
  });

  it("maps network failures", async () => {
    fetchMock.mockRejectedValue(new TypeError("fail"));
    await expect(ensureCsrf()).rejects.toMatchObject({
      status: 0,
      code: "network_error",
    });
  });
});

describe("requests", () => {
  it("GET sends credentials and no CSRF header", async () => {
    fetchMock.mockResolvedValue(json({ ok: true }));
    const out = await apiGet<{ ok: boolean }>("/auth/me/");
    expect(out.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/auth/me/`);
    expect(init.credentials).toBe("include");
    expect(init.headers["X-CSRFToken"]).toBeUndefined();
  });

  it("POST bootstraps CSRF and sends X-CSRFToken with a JSON body", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ csrfToken: "abc" }))
      .mockResolvedValueOnce(json({ detail: "ok" }, 202));
    await apiPost("/auth/request-link/", { email: "a@b.co" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, init] = fetchMock.mock.calls[1];
    expect(init.method).toBe("POST");
    expect(init.headers["X-CSRFToken"]).toBe("abc");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ email: "a@b.co" }));
  });

  it("PATCH and DELETE are unsafe methods that carry the token", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ csrfToken: "abc" }))
      .mockResolvedValueOnce(json({ id: 1 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await apiPatch("/auth/me/", { first_name: "A" });
    await expect(apiDelete("/things/1/")).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[1][1].headers["X-CSRFToken"]).toBe("abc");
    expect(fetchMock.mock.calls[2][1].method).toBe("DELETE");
    expect(fetchMock.mock.calls[2][1].headers["X-CSRFToken"]).toBe("abc");
  });

  it("returns undefined for 204 responses", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ csrfToken: "abc" }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(apiPost("/auth/logout/")).resolves.toBeUndefined();
  });

  it("refreshes a stale CSRF token once and retries", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ csrfToken: "old" }))
      .mockResolvedValueOnce(
        json({ detail: "CSRF Failed: token missing." }, 403),
      )
      .mockResolvedValueOnce(json({ csrfToken: "new" }))
      .mockResolvedValueOnce(json({ ok: true }));
    await expect(apiPost("/x/", {})).resolves.toEqual({ ok: true });
    expect(fetchMock.mock.calls[3][1].headers["X-CSRFToken"]).toBe("new");
  });

  it("does not loop forever on repeated CSRF failures", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith("/auth/csrf/")
        ? json({ csrfToken: "t" })
        : json({ detail: "CSRF Failed" }, 403),
    );
    await expect(apiPost("/x/", {})).rejects.toMatchObject({ status: 403 });
    expect(
      fetchMock.mock.calls.filter((c) => !String(c[0]).endsWith("/auth/csrf/"))
        .length,
    ).toBe(2);
  });
});

describe("error mapping", () => {
  it("maps DRF detail errors", async () => {
    fetchMock.mockResolvedValue(
      json({ detail: "That code or link is invalid or has expired." }, 400),
    );
    const err = await apiGet("/x/").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({
      status: 400,
      message: "That code or link is invalid or has expired.",
    });
  });

  it("maps field errors", () => {
    const err = parseError(400, {
      email: ["Enter a valid email address."],
      code: ["bad"],
    });
    expect(err.fieldErrors.email).toEqual(["Enter a valid email address."]);
    expect(err.message).toBe("Enter a valid email address.");
  });

  it("reads the questionnaire error envelope", () => {
    const err = parseError(409, {
      error: { code: "node_mismatch", message: "That step has changed." },
    });
    expect(err.code).toBe("node_mismatch");
    expect(err.message).toBe("That step has changed.");
    expect(err.fieldErrors).toEqual({});
  });

  it("uses safe fallbacks for non JSON bodies", async () => {
    fetchMock.mockResolvedValue(
      new Response("<html>boom</html>", { status: 500 }),
    );
    const err = (await apiGet("/x/").catch((e: unknown) => e)) as ApiError;
    expect(err.status).toBe(500);
    expect(err.message).not.toContain("html");
  });

  it("maps throttling", () => {
    const err = parseError(429, {
      detail: "Request was throttled. Expected available in 30 seconds.",
    });
    expect(err.code).toBe("throttled");
    expect(err.message).toMatch(/too many/i);
  });

  it("maps network failures on requests", async () => {
    fetchMock.mockRejectedValue(new TypeError("offline"));
    await expect(apiGet("/x/")).rejects.toMatchObject({
      status: 0,
      code: "network_error",
    });
  });
});

describe("unauthorized handler", () => {
  it("fires on 401 and still throws", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    fetchMock.mockResolvedValue(
      json({ detail: "Authentication credentials were not provided." }, 401),
    );
    await expect(apiGet("/auth/me/")).rejects.toMatchObject({ status: 401 });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not fire on other errors", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    fetchMock.mockResolvedValue(json({ detail: "nope" }, 404));
    await expect(apiGet("/x/")).rejects.toMatchObject({ status: 404 });
    expect(handler).not.toHaveBeenCalled();
  });

  it("can be cleared", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    setUnauthorizedHandler(null);
    fetchMock.mockResolvedValue(json({}, 401));
    await expect(apiGet("/x/")).rejects.toMatchObject({ status: 401 });
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("privacy", () => {
  it("never logs request or response bodies", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map(
      (m) => vi.spyOn(console, m).mockImplementation(() => {}),
    );
    fetchMock
      .mockResolvedValueOnce(json({ csrfToken: "t" }))
      .mockResolvedValueOnce(json({ detail: "bad" }, 400));
    await apiPost("/auth/verify/", { token: "secret-token" }).catch(() => {});
    for (const s of spies) expect(s).not.toHaveBeenCalled();
    spies.forEach((s) => s.mockRestore());
  });
});
