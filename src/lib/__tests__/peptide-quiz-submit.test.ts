import { describe, expect, it, vi } from "vitest";
import {
  QUIZ_FORMSPREE_ENDPOINT,
  buildQuizSubmission,
  submitQuizLead,
} from "../peptide-quiz-submit";

const okFetch = () =>
  vi
    .fn()
    .mockResolvedValue({ ok: true, status: 200 }) as unknown as typeof fetch;

describe("buildQuizSubmission", () => {
  it("contains only the trimmed email and routing fields, never answers", () => {
    const f = buildQuizSubmission("  a@b.co ");
    expect(f).toEqual({
      _subject: "Peptide quiz email",
      source: "tools/peptide-quiz",
      email: "a@b.co",
    });
    expect(Object.keys(f).join(" ")).not.toMatch(/q\d|goal|flags|answer/i);
  });

  it("contains no dashes", () => {
    const text = Object.values(buildQuizSubmission("a@b.co")).join(" ");
    expect(text).not.toMatch(/\u2014|\u2013/);
  });
});

describe("submitQuizLead", () => {
  it("posts JSON to Formspree and resolves ok", async () => {
    const fetchMock = okFetch();
    const res = await submitQuizLead("a@b.co", fetchMock);
    expect(res).toEqual({ ok: true });
    const [url, init] = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(url).toBe(QUIZ_FORMSPREE_ENDPOINT);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      _subject: "Peptide quiz email",
      source: "tools/peptide-quiz",
      email: "a@b.co",
    });
  });

  it.each([
    "",
    "not-an-email",
    "a@b",
    "<script>alert(1)</script>@x.com",
    "a@b.co'; DROP TABLE users;--",
    "../../etc/passwd",
    "a@b.co\r\nBcc: x@y.com",
    `${"a".repeat(300)}@b.co`,
  ])("rejects invalid email %j without any network call", async (email) => {
    const fetchMock = okFetch();
    const res = await submitQuizLead(email, fetchMock);
    expect(res.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns an error on a non-2xx response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 422 }) as unknown as typeof fetch;
    expect((await submitQuizLead("a@b.co", fetchMock)).ok).toBe(false);
  });

  it("returns an error when the network fails", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValue(new Error("offline")) as unknown as typeof fetch;
    expect((await submitQuizLead("a@b.co", fetchMock)).ok).toBe(false);
  });
});
