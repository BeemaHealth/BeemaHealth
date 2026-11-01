import { describe, expect, it, vi } from "vitest";
import {
  BLOG_SUBMISSION_FORMSPREE_ENDPOINT,
  BLOG_SUBMISSION_LIMITS,
  buildBlogSubmission,
  isValidHttpUrl,
  submitBlogSubmission,
  validateBlogSubmission,
  type BlogSubmissionInput,
} from "@/lib/blog-submission";
import {
  COMMAND_INJECTION,
  KNOWN_NAME_FORMAT_PASSES,
  PATH_TRAVERSAL,
  SQL_INJECTION,
  XSS_PAYLOADS,
} from "./fixtures/malicious-payloads";

const VALID: BlogSubmissionInput = {
  name: "Jane Q. Writer",
  email: "jane@example.com",
  title: "Five habits that made GLP-1 care easier to stick with",
  body: "A".repeat(400),
  bio: "Registered dietitian.",
  url: "https://example.com/draft",
  agreed: true,
};

const STRICT_ATTACKS = [
  ...SQL_INJECTION,
  ...XSS_PAYLOADS,
  ...PATH_TRAVERSAL,
  ...COMMAND_INJECTION,
];

describe("validateBlogSubmission", () => {
  it("accepts a valid submission", () => {
    expect(validateBlogSubmission(VALID)).toEqual({});
  });

  it("accepts optional fields left empty", () => {
    expect(validateBlogSubmission({ ...VALID, bio: "", url: "" })).toEqual({});
  });

  it("requires every required field", () => {
    const errors = validateBlogSubmission({
      name: "",
      email: "",
      title: "",
      body: "",
      bio: "",
      url: "",
      agreed: false,
    });
    expect(Object.keys(errors).sort()).toEqual(
      ["agreed", "body", "email", "name", "title"].sort(),
    );
  });

  it("rejects whitespace-only required fields", () => {
    const errors = validateBlogSubmission({
      ...VALID,
      name: "   ",
      title: "   ",
      body: "   ",
    });
    expect(errors.name).toBeDefined();
    expect(errors.title).toBeDefined();
    expect(errors.body).toBeDefined();
  });

  it("rejects an invalid email format", () => {
    expect(validateBlogSubmission({ ...VALID, email: "nope" }).email).toBe(
      "Enter a valid email address.",
    );
  });

  it("rejects an email over the RFC length cap", () => {
    const email = `${"a".repeat(250)}@example.com`;
    expect(validateBlogSubmission({ ...VALID, email }).email).toBeDefined();
  });

  it("rejects a body that is too short", () => {
    expect(
      validateBlogSubmission({ ...VALID, body: "Too short." }).body,
    ).toMatch(/at least/);
  });

  it("rejects overflow in every length-capped field", () => {
    const L = BLOG_SUBMISSION_LIMITS;
    const errors = validateBlogSubmission({
      ...VALID,
      name: "a".repeat(L.name + 1),
      title: "a".repeat(L.title + 1),
      body: "a".repeat(L.body + 1),
      bio: "a".repeat(L.bio + 1),
      url: `https://example.com/${"a".repeat(L.url)}`,
    });
    expect(errors.name).toBeDefined();
    expect(errors.title).toBeDefined();
    expect(errors.body).toBeDefined();
    expect(errors.bio).toBeDefined();
    expect(errors.url).toBeDefined();
  });

  it("rejects control characters in title, body, and bio", () => {
    const errors = validateBlogSubmission({
      ...VALID,
      title: "Hello\u0000world",
      body: `${"a".repeat(400)}\u0007`,
      bio: "bio\u001B[31m",
    });
    expect(errors.title).toBeDefined();
    expect(errors.body).toBeDefined();
    expect(errors.bio).toBeDefined();
  });

  it("allows normal punctuation and newlines in the body", () => {
    const body = `${"Line one; it's fine -- really.\n\n".repeat(20)}select the right plan.`;
    expect(validateBlogSubmission({ ...VALID, body })).toEqual({});
  });

  it("requires the terms checkbox", () => {
    expect(validateBlogSubmission({ ...VALID, agreed: false }).agreed).toMatch(
      /confirm/,
    );
  });

  describe("strict fields reject injection payloads", () => {
    const nameAttacks = STRICT_ATTACKS.filter(
      (p) => !(KNOWN_NAME_FORMAT_PASSES as readonly string[]).includes(p),
    );
    it.each(nameAttacks.map((p) => [p]))("name: %s", (payload) => {
      expect(
        validateBlogSubmission({ ...VALID, name: payload }).name,
      ).toBeDefined();
    });

    it.each(STRICT_ATTACKS.map((p) => [p]))("email: %s", (payload) => {
      expect(
        validateBlogSubmission({ ...VALID, email: `${payload}@evil.com` })
          .email,
      ).toBeDefined();
    });
  });

  describe("url", () => {
    it.each([
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "file:///etc/passwd",
      "ftp://example.com/x",
      "not a url",
      "//evil.com",
    ])("rejects %s", (value) => {
      expect(isValidHttpUrl(value)).toBe(false);
      expect(
        validateBlogSubmission({ ...VALID, url: value }).url,
      ).toBeDefined();
    });

    it("accepts http and https links", () => {
      expect(isValidHttpUrl("https://docs.google.com/document/d/abc")).toBe(
        true,
      );
      expect(isValidHttpUrl("http://example.com")).toBe(true);
    });
  });
});

describe("buildBlogSubmission", () => {
  it("sends only the form fields plus routing keys, trimmed", () => {
    const payload = buildBlogSubmission({
      ...VALID,
      name: "  Jane  ",
      email: " jane@example.com ",
    });
    expect(Object.keys(payload).sort()).toEqual(
      [
        "_subject",
        "bio",
        "body",
        "email",
        "name",
        "source",
        "title",
        "url",
      ].sort(),
    );
    expect(payload.name).toBe("Jane");
    expect(payload.email).toBe("jane@example.com");
    expect(payload.source).toBe("blogs/submit");
    expect(payload._subject).toBe(`Blog submission: ${VALID.title}`);
  });
});

describe("submitBlogSubmission", () => {
  it("posts JSON to Formspree and returns ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const res = await submitBlogSubmission(
      VALID,
      fetchMock as unknown as typeof fetch,
    );
    expect(res).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(BLOG_SUBMISSION_FORMSPREE_ENDPOINT);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body).title).toBe(VALID.title);
  });

  it("does not call the network for an invalid submission", async () => {
    const fetchMock = vi.fn();
    const res = await submitBlogSubmission(
      { ...VALID, email: "bad" },
      fetchMock as unknown as typeof fetch,
    );
    expect(res.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a friendly error on a non-2xx response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const res = await submitBlogSubmission(
      VALID,
      fetchMock as unknown as typeof fetch,
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/could not send/i);
  });

  it("returns a friendly error when the request throws", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    const res = await submitBlogSubmission(
      VALID,
      fetchMock as unknown as typeof fetch,
    );
    expect(res.ok).toBe(false);
  });
});
