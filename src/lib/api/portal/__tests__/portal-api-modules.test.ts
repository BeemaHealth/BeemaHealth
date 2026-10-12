import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../client", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}));

import * as account from "../account";
import * as billing from "../billing";
import * as chat from "../chat";
import { apiDelete, apiGet, apiPatch, apiPost } from "../client";
import * as shots from "../shots";
import * as treatments from "../treatments";

const get = vi.mocked(apiGet);
const post = vi.mocked(apiPost);
const patch = vi.mocked(apiPatch);
const del = vi.mocked(apiDelete);

beforeEach(() => {
  get.mockResolvedValue({});
  post.mockResolvedValue({});
  patch.mockResolvedValue({});
  del.mockResolvedValue(undefined);
});

describe("treatments api", () => {
  it("lists treatments by tab", async () => {
    await treatments.listTreatments("pending");
    expect(get).toHaveBeenCalledWith("/treatments/?tab=pending");
    await treatments.listTreatments();
    expect(get).toHaveBeenLastCalledWith("/treatments/");
  });

  it("encodes ids and posts cancel without a body", async () => {
    await treatments.cancelTreatment("a/b");
    expect(post).toHaveBeenCalledWith("/treatments/a%2Fb/cancel/");
  });

  it("unwraps next shipment and handles null", async () => {
    get.mockResolvedValueOnce({ next_shipment: null });
    expect(await treatments.getNextShipment()).toBeNull();
    get.mockResolvedValueOnce({ next_shipment: { id: "s1" } });
    expect(await treatments.getNextShipment()).toEqual({ id: "s1" });
    expect(get).toHaveBeenCalledWith("/fulfillment/next-shipment/");
  });

  it("requests a refill with the treatment id", async () => {
    await treatments.requestRefill("t1");
    expect(post).toHaveBeenCalledWith("/fulfillment/request-refill/", {
      treatment: "t1",
    });
  });
});

describe("shots api", () => {
  it("builds dose log filters", async () => {
    await shots.listDoseLogs({
      treatment: "t1",
      overdue: true,
      status: "scheduled",
    });
    const url = get.mock.calls[0][0];
    expect(url).toContain("/treatments/dose-logs/?");
    expect(url).toContain("treatment=t1");
    expect(url).toContain("overdue=1");
    expect(url).toContain("status=scheduled");
  });

  it("omits the query string when there are no filters", async () => {
    await shots.listDoseLogs();
    expect(get).toHaveBeenCalledWith("/treatments/dose-logs/");
  });

  it("creates, patches and deletes doses", async () => {
    await shots.createDoseLog({ treatment: "t1", status: "taken" });
    expect(post).toHaveBeenCalledWith("/treatments/dose-logs/", {
      treatment: "t1",
      status: "taken",
    });
    await shots.updateDoseLog("d1", { pain_0_5: 2 });
    expect(patch).toHaveBeenCalledWith("/treatments/dose-logs/d1/", {
      pain_0_5: 2,
    });
    await shots.deleteDoseLog("d1");
    expect(del).toHaveBeenCalledWith("/treatments/dose-logs/d1/");
  });

  it("filters health metrics by kind", async () => {
    await shots.listHealthMetrics("weight");
    expect(get).toHaveBeenCalledWith("/treatments/health-metrics/?kind=weight");
  });
});

describe("chat api", () => {
  it("uses the router action urls", async () => {
    await chat.getConversation("c1");
    expect(get).toHaveBeenCalledWith("/messaging/conversations/c1/");
    await chat.sendMessage("c1", "hi");
    expect(post).toHaveBeenCalledWith(
      "/messaging/conversations/c1/send_message/",
      { body: "hi", attachments: [] },
    );
    await chat.markAllRead();
    expect(post).toHaveBeenCalledWith("/messaging/conversations/mark_read/");
    await chat.requestUploadUrl("c1");
    expect(post).toHaveBeenCalledWith(
      "/messaging/conversations/c1/upload_url/",
    );
  });

  it("refuses an upload target without a key", async () => {
    const file = new File(["x"], "a.png", { type: "image/png" });
    await expect(
      chat.uploadToPresigned(
        { upload_url: "https://example.test", fields: {} },
        file,
      ),
    ).rejects.toThrow();
  });

  it("uploads and returns the key, failing on a non-ok response", async () => {
    const file = new File(["x"], "a.png", { type: "image/png" });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false });
    vi.stubGlobal("fetch", fetchMock);
    const target = {
      upload_url: "https://example.test/up",
      fields: { key: "k1" },
    };
    await expect(chat.uploadToPresigned(target, file)).resolves.toBe("k1");
    await expect(chat.uploadToPresigned(target, file)).rejects.toThrow(
      "Upload failed",
    );
    vi.unstubAllGlobals();
  });
});

describe("account api", () => {
  it("hits auth and patient endpoints", async () => {
    await account.getMe();
    expect(get).toHaveBeenCalledWith("/auth/me/");
    await account.updateMe({ phone: "7195551234" });
    expect(patch).toHaveBeenCalledWith("/auth/me/", { phone: "7195551234" });
    await account.getProfile();
    expect(get).toHaveBeenCalledWith("/patients/me/profile/");
    await account.listAddresses();
    expect(get).toHaveBeenCalledWith("/patients/addresses/");
    await account.deleteAddress("a1");
    expect(del).toHaveBeenCalledWith("/patients/addresses/a1/");
  });

  it("creates data requests and exports", async () => {
    await account.createDataRequest("deletion");
    expect(post).toHaveBeenCalledWith("/patients/data-requests/", {
      kind: "deletion",
    });
    await account.exportMyData();
    expect(get).toHaveBeenCalledWith("/patients/export/");
  });
});

describe("billing api", () => {
  it("toggles auto renew", async () => {
    await billing.setAutoRenew("s1", false);
    expect(post).toHaveBeenCalledWith("/billing/subscriptions/s1/auto-renew/", {
      enabled: false,
    });
  });

  it("sets the default payment method with the expected body", async () => {
    await billing.setDefaultPaymentMethod("pm_1");
    expect(post).toHaveBeenCalledWith("/billing/payment-methods/default/", {
      payment_method_id: "pm_1",
    });
  });

  it("unwraps the setup intent secret and credit balance", async () => {
    post.mockResolvedValueOnce({ client_secret: "seti_secret" });
    expect(await billing.createSetupIntent()).toBe("seti_secret");
    get.mockResolvedValueOnce({ balance_cents: 1250 });
    expect(await billing.getStoreCredit()).toBe(1250);
  });

  it("lists invoices and payment methods", async () => {
    await billing.listInvoices();
    expect(get).toHaveBeenCalledWith("/billing/invoices/");
    await billing.listPaymentMethods();
    expect(get).toHaveBeenCalledWith("/billing/payment-methods/");
  });
});
