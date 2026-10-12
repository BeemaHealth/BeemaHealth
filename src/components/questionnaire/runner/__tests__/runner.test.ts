// @vitest-environment jsdom
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement as h } from "react";

vi.mock("@/lib/api/portal/questionnaire", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/portal/questionnaire")>()),
  resumeOrStart: vi.fn(),
  getCurrent: vi.fn(),
  submitAnswer: vi.fn(),
  goBack: vi.fn(),
}));

import { ApiError } from "@/lib/api/portal/client";
import * as api from "@/lib/api/portal/questionnaire";
import { QuestionnaireRunner } from "../QuestionnaireRunner";
import {
  QuestionnaireShell,
  resolveFooterHref,
  showBackButton,
} from "../QuestionnaireShell";
import { installBrowserStubs, LAYOUT, node, view } from "./helpers";

beforeAll(installBrowserStubs);
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

const motivation = node({
  id: "motivation",
  type: "radio",
  title: "What is your motivation?",
  options: [{ key: "health", label: "Improve my health" }],
});
const weightGoal = node({
  id: "weight_goal",
  type: "radio",
  title: "What is your weight loss goal?",
  options: [{ key: "ten", label: "10 to 20 lbs" }],
});

describe("QuestionnaireRunner", () => {
  it("renders the node the server returns and follows the server's next node", async () => {
    const user = userEvent.setup();
    vi.mocked(api.resumeOrStart).mockResolvedValue(view(motivation));
    vi.mocked(api.submitAnswer).mockResolvedValue(
      view(weightGoal, { path: ["motivation"], progress: 0.4 }),
    );

    render(h(QuestionnaireRunner, { slug: "weight_loss" }));
    await screen.findByRole("heading", { name: "What is your motivation?" });
    expect(api.resumeOrStart).toHaveBeenCalledWith(
      "weight_loss",
      expect.any(Object),
    );

    await user.click(screen.getByRole("radio", { name: /improve my health/i }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(api.submitAnswer).toHaveBeenCalledWith("motivation", "health");
    await screen.findByRole("heading", {
      name: "What is your weight loss goal?",
    });
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "40",
    );
  });

  it("shows the server's error and stays on the node when an answer is rejected", async () => {
    const user = userEvent.setup();
    vi.mocked(api.resumeOrStart).mockResolvedValue(view(motivation));
    vi.mocked(api.submitAnswer).mockRejectedValue(
      new ApiError(400, "invalid_option", "Choose one of the listed options."),
    );

    render(h(QuestionnaireRunner, { slug: "weight_loss" }));
    await screen.findByRole("heading", { name: "What is your motivation?" });
    await user.click(screen.getByRole("radio", { name: /improve my health/i }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /listed options/i,
    );
    expect(
      screen.getByRole("heading", { name: "What is your motivation?" }),
    ).toBeTruthy();
  });

  it("goes back through the server and renders what it returns", async () => {
    const user = userEvent.setup();
    vi.mocked(api.resumeOrStart).mockResolvedValue(
      view(weightGoal, { path: ["motivation"] }),
    );
    vi.mocked(api.goBack).mockResolvedValue(view(motivation));

    render(h(QuestionnaireRunner, { slug: "weight_loss" }));
    await screen.findByRole("heading", {
      name: "What is your weight loss goal?",
    });
    await user.click(screen.getByRole("button", { name: "Back" }));
    await screen.findByRole("heading", { name: "What is your motivation?" });
    expect(api.goBack).toHaveBeenCalled();
  });

  it("renders a warm disqualification page with a way back", async () => {
    const user = userEvent.setup();
    const stop = node({
      id: "no_proceed_age",
      type: "no_proceed",
      title: "You must be 18 or older",
      body: "This program is for adults.",
    });
    vi.mocked(api.resumeOrStart).mockResolvedValue(
      view(stop, {
        status: "disqualified",
        path: ["basics"],
        disqualify_reason: "under_18",
      }),
    );
    vi.mocked(api.goBack).mockResolvedValue(view(motivation));

    render(h(QuestionnaireRunner, { slug: "weight_loss" }));
    await screen.findByRole("heading", { name: "You must be 18 or older" });
    expect(screen.getByText(/welcome back the day you turn 18/i)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /talk to our team/i }),
    ).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /change an answer/i }));
    await screen.findByRole("heading", { name: "What is your motivation?" });
  });

  it("offers a retry when the questionnaire cannot load", async () => {
    const user = userEvent.setup();
    vi.mocked(api.resumeOrStart).mockRejectedValueOnce(
      new ApiError(503, "x", "Service unavailable."),
    );
    vi.mocked(api.resumeOrStart).mockResolvedValueOnce(view(motivation));
    render(h(QuestionnaireRunner, { slug: "weight_loss" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /unavailable/i,
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByRole("heading", { name: "What is your motivation?" });
  });

  it("re-syncs with the server when the step is no longer current", async () => {
    const user = userEvent.setup();
    vi.mocked(api.resumeOrStart).mockResolvedValue(view(motivation));
    vi.mocked(api.submitAnswer).mockRejectedValue(
      new ApiError(409, "node_mismatch", "That step is no longer current."),
    );
    vi.mocked(api.getCurrent).mockResolvedValue(
      view(weightGoal, { path: ["motivation"] }),
    );
    render(h(QuestionnaireRunner, { slug: "weight_loss" }));
    await screen.findByRole("heading", { name: "What is your motivation?" });
    await user.click(screen.getByRole("radio", { name: /improve my health/i }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(api.getCurrent).toHaveBeenCalled());
    await screen.findByRole("heading", {
      name: "What is your weight loss goal?",
    });
  });

  it("never writes to browser storage", async () => {
    const local = vi.spyOn(Storage.prototype, "setItem");
    vi.mocked(api.resumeOrStart).mockResolvedValue(view(motivation));
    render(h(QuestionnaireRunner, { slug: "weight_loss" }));
    await screen.findByRole("heading", { name: "What is your motivation?" });
    expect(local).not.toHaveBeenCalled();
  });
});

describe("shell helpers", () => {
  it("hides back on the first step and on configured node types", () => {
    expect(showBackButton(LAYOUT, "radio", 0)).toBe(false);
    expect(showBackButton(LAYOUT, "radio", 2)).toBe(true);
    expect(showBackButton(LAYOUT, "auth", 2)).toBe(false);
    expect(showBackButton(LAYOUT, "thank_you", 5)).toBe(false);
    expect(
      showBackButton({ back_button: { enabled: false } }, "radio", 3),
    ).toBe(false);
  });

  it("maps legacy footer links to the live legal routes", () => {
    expect(resolveFooterHref("/privacy")).toBe("/legal/privacy");
    expect(resolveFooterHref("/contact")).toBe("/contact");
  });

  it("exposes progress accessibly and renders footer text", () => {
    render(
      h(QuestionnaireShell, {
        layout: LAYOUT,
        progress: 0.5,
        nodeId: "n",
        nodeType: "radio",
        pathLength: 1,
        onBack: () => undefined,
        children: h("p", null, "body"),
      }),
    );
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "50",
    );
    expect(screen.getByText(/telehealth service/i)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Privacy" }).getAttribute("href"),
    ).toBe("/legal/privacy");
  });
});
