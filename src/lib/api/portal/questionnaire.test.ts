import { beforeEach, describe, expect, it, vi } from "vitest";

const apiGet = vi.fn();
const apiPost = vi.fn();

vi.mock("./client", async () => {
  class ApiError extends Error {
    status: number;
    code: string;
    constructor(status: number, code: string, message: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  }
  return {
    ApiError,
    apiGet: (...a: unknown[]) => apiGet(...a),
    apiPost: (...a: unknown[]) => apiPost(...a),
  };
});

import { ApiError } from "./client";
import {
  claimSubmission,
  getCurrent,
  goBack,
  requestLoginCode,
  requestUpload,
  resumeOrStart,
  startQuestionnaire,
  submitAnswer,
  uploadFile,
  uploadToStorage,
  verifyLoginCode,
} from "./questionnaire";

beforeEach(() => {
  apiGet.mockReset();
  apiPost.mockReset();
});

describe("questionnaire api", () => {
  it("posts start with only short string utm values", async () => {
    apiPost.mockResolvedValue({});
    await startQuestionnaire("weight_loss", {
      utm_source: "x".repeat(300),
      utm_medium: undefined,
      utm_term: "",
    });
    const [path, body] = apiPost.mock.calls[0];
    expect(path).toBe("/questionnaires/start/");
    expect(body).toEqual({
      questionnaire: "weight_loss",
      utm: { utm_source: "x".repeat(100) },
    });
  });

  it("omits utm when empty", async () => {
    apiPost.mockResolvedValue({});
    await startQuestionnaire("weight_loss");
    expect(apiPost.mock.calls[0][1]).toEqual({ questionnaire: "weight_loss" });
  });

  it("submits the node id with its value", async () => {
    apiPost.mockResolvedValue({});
    await submitAnswer("motivation", "health");
    expect(apiPost).toHaveBeenCalledWith("/questionnaires/answer/", {
      node_id: "motivation",
      value: "health",
    });
  });

  it("calls current, back and claim", async () => {
    apiGet.mockResolvedValue({});
    apiPost.mockResolvedValue({});
    await getCurrent();
    await goBack();
    await claimSubmission();
    expect(apiGet).toHaveBeenCalledWith("/questionnaires/current/");
    expect(apiPost.mock.calls.map((c) => c[0])).toEqual([
      "/questionnaires/back/",
      "/questionnaires/claim/",
    ]);
  });

  it("resumes when a submission exists", async () => {
    apiGet.mockResolvedValue({ submission_id: "s" });
    await expect(resumeOrStart("weight_loss")).resolves.toEqual({
      submission_id: "s",
    });
    expect(apiPost).not.toHaveBeenCalled();
  });

  it("starts a new submission on 204 and rethrows errors", async () => {
    apiGet.mockResolvedValueOnce(null);
    apiPost.mockResolvedValue({ submission_id: "new" });
    await expect(resumeOrStart("weight_loss")).resolves.toEqual({
      submission_id: "new",
    });

    apiGet.mockRejectedValueOnce(
      new (ApiError as never as new (s: number, c: string, m: string) => Error)(
        500,
        "x",
        "boom",
      ),
    );
    await expect(resumeOrStart("weight_loss")).rejects.toThrow("boom");
  });

  it("requests an upload url and posts the file to the presigned target", async () => {
    apiPost.mockResolvedValue({
      file_id: "f1",
      upload: {
        url: "https://s3.example/up",
        fields: { key: "k", "Content-Type": "image/png" },
      },
    });
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["abc"], "id.png", { type: "image/png" });
    await expect(uploadFile("id_photo", file)).resolves.toBe("f1");
    expect(apiPost).toHaveBeenCalledWith("/questionnaires/upload-url/", {
      kind: "id_photo",
      content_type: "image/png",
      size_bytes: 3,
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://s3.example/up");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBeUndefined();
    const form = init.body as FormData;
    expect(form.get("key")).toBe("k");
    expect(form.get("file")).toBeInstanceOf(File);
    vi.unstubAllGlobals();
  });

  it("surfaces a failed storage upload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("no", { status: 403 })),
    );
    await expect(
      uploadToStorage(
        { file_id: "f", upload: { url: "https://s3.example", fields: {} } },
        new File(["a"], "a.png", { type: "image/png" }),
      ),
    ).rejects.toMatchObject({ code: "upload_failed" });
    vi.unstubAllGlobals();
    apiPost.mockResolvedValue({});
    await requestUpload("id_photo", "image/png", 1);
  });

  it("uses the auth endpoints for account creation", async () => {
    apiPost.mockResolvedValue({});
    await requestLoginCode("a@b.com");
    await verifyLoginCode("a@b.com", "123456");
    expect(apiPost).toHaveBeenNthCalledWith(1, "/auth/request-link/", {
      email: "a@b.com",
    });
    expect(apiPost).toHaveBeenNthCalledWith(2, "/auth/verify/", {
      email: "a@b.com",
      code: "123456",
    });
  });
});
