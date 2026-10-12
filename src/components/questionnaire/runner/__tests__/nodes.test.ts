// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement as h } from "react";

vi.mock("@/lib/api/portal/questionnaire", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/portal/questionnaire")>()),
  uploadFile: vi.fn(async () => "11111111-1111-4111-8111-111111111111"),
  requestLoginCode: vi.fn(async () => ({ detail: "ok" })),
  verifyLoginCode: vi.fn(async () => ({})),
  claimSubmission: vi.fn(),
}));

import * as api from "@/lib/api/portal/questionnaire";
import { NODE_RENDERERS, NodeRenderer } from "../NodeRenderer";
import { installBrowserStubs, node, props, view } from "./helpers";

beforeAll(installBrowserStubs);
afterEach(cleanup);

function mount(n: ReturnType<typeof node>, extra = {}) {
  const p = props(n, extra);
  render(h(NodeRenderer, p.props));
  return p;
}

describe("renderer coverage", () => {
  it("has a renderer for every client-facing node type", () => {
    const types = [
      "radio",
      "multi_select",
      "text",
      "textarea",
      "number",
      "date",
      "empty_page",
      "auth",
      "basics",
      "bmi",
      "safety_consent",
      "allergies",
      "add_medication",
      "med_conditions",
      "file_input",
      "id_photo",
      "checkout",
      "no_proceed",
      "thank_you",
    ];
    for (const t of types)
      expect(NODE_RENDERERS[t as keyof typeof NODE_RENDERERS]).toBeTypeOf(
        "function",
      );
  });
});

describe("radio", () => {
  const n = node({
    id: "motivation",
    type: "radio",
    title: "What is your motivation?",
    options: [
      { key: "health", label: "Improve my health" },
      { key: "energy", label: "More energy" },
    ],
  });

  it("blocks continue without a choice, then submits the key", async () => {
    const user = userEvent.setup();
    const { onSubmit } = mount(n);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert").textContent).toMatch(/choose one option/i);
    expect(onSubmit).not.toHaveBeenCalled();
    await user.click(screen.getByRole("radio", { name: /more energy/i }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onSubmit).toHaveBeenCalledWith("energy");
  });

  it("restores the server's previous answer", () => {
    mount(n, { previous: "health" });
    expect(
      screen
        .getByRole("radio", { name: /improve my health/i })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("auto advances when the layout asks for it", async () => {
    const user = userEvent.setup();
    const { onSubmit } = mount(n, {
      layout: { node_types: { radio: { auto_advance: true } } },
    });
    await user.click(screen.getByRole("radio", { name: /improve my health/i }));
    expect(onSubmit).toHaveBeenCalledWith("health");
  });
});

describe("multi_select", () => {
  const n = node({
    id: "conditions",
    type: "multi_select",
    options: [
      { key: "kidney", label: "Kidney disease" },
      { key: "gall", label: "Gallbladder disease" },
      { key: "none", label: "None of these", exclusive: true },
    ],
  });
  it("submits selected keys and keeps exclusive options exclusive", async () => {
    const user = userEvent.setup();
    const { onSubmit } = mount(n);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert")).toBeTruthy();
    await user.click(screen.getByRole("checkbox", { name: /kidney/i }));
    await user.click(screen.getByRole("checkbox", { name: /none of these/i }));
    expect(
      screen
        .getByRole("checkbox", { name: /kidney/i })
        .getAttribute("aria-checked"),
    ).toBe("false");
    await user.click(screen.getByRole("checkbox", { name: /gallbladder/i }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onSubmit).toHaveBeenCalledWith(["gall"]);
  });
});

describe("text, textarea, number, date", () => {
  it("text validates email format", async () => {
    const user = userEvent.setup();
    const { onSubmit } = mount(
      node({ id: "e", type: "text", format: "email", title: "Email" }),
    );
    await user.type(screen.getByRole("textbox"), "bad");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert").textContent).toMatch(/valid email/i);
    await user.clear(screen.getByRole("textbox"));
    await user.type(screen.getByRole("textbox"), "Me@Example.com");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onSubmit).toHaveBeenCalledWith("me@example.com");
  });

  it("textarea submits trimmed text and requires content", async () => {
    const user = userEvent.setup();
    const { onSubmit } = mount(
      node({ id: "t", type: "textarea", title: "Notes" }),
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onSubmit).not.toHaveBeenCalled();
    await user.type(screen.getByRole("textbox"), "  hello there  ");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onSubmit).toHaveBeenCalledWith("hello there");
  });

  it("number enforces bounds", async () => {
    const user = userEvent.setup();
    const { onSubmit } = mount(
      node({
        id: "n",
        type: "number",
        title: "Age",
        min: 1,
        max: 5,
        integer: true,
      }),
    );
    await user.type(screen.getByRole("textbox"), "9");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert").textContent).toMatch(/too high/i);
    await user.clear(screen.getByRole("textbox"));
    await user.type(screen.getByRole("textbox"), "4");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onSubmit).toHaveBeenCalledWith(4);
  });

  it("date submits an ISO date", async () => {
    const user = userEvent.setup();
    const { onSubmit } = mount(node({ id: "d", type: "date", title: "When" }));
    await user.type(screen.getByLabelText("Month (MM)"), "03");
    await user.type(screen.getByLabelText("Day (DD)"), "09");
    await user.type(screen.getByLabelText("Year (YYYY)"), "2001");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onSubmit).toHaveBeenCalledWith("2001-03-09");
  });
});

describe("empty_page and safety_consent", () => {
  it("empty page continues with an acknowledgement", async () => {
    const user = userEvent.setup();
    const { onSubmit } = mount(
      node({
        id: "goal_closer",
        type: "empty_page",
        title: "Closer than you think",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onSubmit).toHaveBeenCalledWith(true);
  });

  it("safety consent shows the statement and sends accepted", async () => {
    const user = userEvent.setup();
    const { onSubmit } = mount(
      node({
        id: "c",
        type: "safety_consent",
        statement: "I understand BMI matters.",
      }),
    );
    expect(screen.getByText("I understand BMI matters.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "I agree" }));
    expect(onSubmit).toHaveBeenCalledWith({ accepted: true });
  });
});

describe("basics", () => {
  it("validates, then submits the normalized object", async () => {
    const user = userEvent.setup();
    const { onSubmit } = mount(
      node({ id: "basics", type: "basics", title: "About you" }),
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(2);

    await user.type(screen.getByLabelText("Month (MM)"), "05");
    await user.type(screen.getByLabelText("Day (DD)"), "05");
    await user.type(screen.getByLabelText("Year (YYYY)"), "1990");
    await user.click(screen.getByRole("radio", { name: "Female" }));
    await user.selectOptions(screen.getByLabelText("State"), "TX");
    await user.type(screen.getByLabelText("ZIP code"), "77002");
    await user.type(screen.getByLabelText("Mobile phone"), "7135550142");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onSubmit).toHaveBeenCalledWith({
      dob: "1990-05-05",
      sex_at_birth: "female",
      state: "TX",
      zip: "77002",
      phone: "+17135550142",
    });
  });

  it("lets an under 18 date through so the server can show the age page", async () => {
    const user = userEvent.setup();
    const { onSubmit } = mount(node({ id: "basics", type: "basics" }));
    await user.type(screen.getByLabelText("Month (MM)"), "01");
    await user.type(screen.getByLabelText("Day (DD)"), "01");
    await user.type(
      screen.getByLabelText("Year (YYYY)"),
      String(new Date().getFullYear() - 10),
    );
    await user.click(screen.getByRole("radio", { name: "Male" }));
    await user.selectOptions(screen.getByLabelText("State"), "TX");
    await user.type(screen.getByLabelText("ZIP code"), "77002");
    await user.type(screen.getByLabelText("Mobile phone"), "7135550142");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe("bmi", () => {
  it("submits height and weight as numbers", async () => {
    const user = userEvent.setup();
    const { onSubmit } = mount(
      node({ id: "bmi_new", type: "bmi", title: "Height and weight" }),
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onSubmit).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText("Height (feet)"), "5");
    await user.type(screen.getByLabelText("Height (inches)"), "8");
    await user.type(screen.getByLabelText("Weight (lbs)"), "205.5");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onSubmit).toHaveBeenCalledWith({
      height_feet: 5,
      height_inches: 8,
      weight_lbs: 205.5,
    });
  });
});

describe("list nodes", () => {
  it("allergies: none shortcut", async () => {
    const user = userEvent.setup();
    const { onSubmit } = mount(
      node({ id: "allergies", type: "allergies", title: "Allergies" }),
    );
    await user.click(
      screen.getByRole("checkbox", { name: /no known allergies/i }),
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onSubmit).toHaveBeenCalledWith({ none: true, items: [] });
  });

  it("add_medication: needs at least one item, includes a pending draft", async () => {
    const user = userEvent.setup();
    const { onSubmit } = mount(
      node({
        id: "add_medication",
        type: "add_medication",
        title: "Medications",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert").textContent).toMatch(/add at least one/i);
    await user.type(screen.getByLabelText("Medication"), "Lisinopril");
    await user.type(screen.getByLabelText("Dose"), "10 mg");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onSubmit).toHaveBeenCalledWith({
      none: false,
      items: [{ name: "Lisinopril", dose: "10 mg" }],
    });
  });

  it("med_conditions rejects unsafe characters", async () => {
    const user = userEvent.setup();
    const { onSubmit } = mount(
      node({
        id: "med_conditions",
        type: "med_conditions",
        title: "Conditions",
      }),
    );
    await user.type(
      screen.getByLabelText("Condition"),
      "<script>alert(1)</script>",
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
  });
});

describe("file nodes", () => {
  it("uploads via the API and submits only file ids", async () => {
    const user = userEvent.setup();
    const { onSubmit } = mount(
      node({
        id: "id_verification",
        type: "id_photo",
        title: "Verify ID",
        file_kind: "id_photo",
        required: true,
      }),
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onSubmit).not.toHaveBeenCalled();
    const input = document.querySelector(
      "input[type=file]",
    ) as HTMLInputElement;
    await user.upload(input, new File(["x"], "id.png", { type: "image/png" }));
    await waitFor(() =>
      expect(api.uploadFile).toHaveBeenCalledWith("id_photo", expect.any(File)),
    );
    await screen.findByLabelText("Uploaded files");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onSubmit).toHaveBeenCalledWith({
      file_ids: ["11111111-1111-4111-8111-111111111111"],
    });
  });

  it("rejects a disallowed file type without uploading", async () => {
    const user = userEvent.setup({ applyAccept: false });
    mount(
      node({
        id: "f",
        type: "file_input",
        required: true,
        file_kind: "glp1_proof",
      }),
    );
    const input = document.querySelector(
      "input[type=file]",
    ) as HTMLInputElement;
    await user.upload(
      input,
      new File(["x"], "evil.exe", { type: "application/x-msdownload" }),
    );
    expect((await screen.findByRole("alert")).textContent).toMatch(/jpg, png/i);
    expect(api.uploadFile).not.toHaveBeenCalled();
  });

  it("offers skip only when the server says the upload is optional", async () => {
    const user = userEvent.setup();
    const { onSubmit } = mount(
      node({
        id: "glp1_proof",
        type: "file_input",
        required: false,
        file_kind: "glp1_proof",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Skip for now" }));
    expect(onSubmit).toHaveBeenCalledWith({ skipped: true });
  });
});

describe("auth", () => {
  it("emails a code, verifies it, then claims the submission", async () => {
    const user = userEvent.setup();
    const claimed = view(node({ id: "basics", type: "basics" }));
    vi.mocked(api.claimSubmission).mockResolvedValue(claimed);
    const { props: p } = props(
      node({ id: "auth", type: "auth", title: "Create your account" }),
    );
    render(h(NodeRenderer, p));

    await user.type(screen.getByLabelText("Email address"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Email me a code" }));
    expect(screen.getByRole("alert").textContent).toMatch(/valid email/i);
    expect(api.requestLoginCode).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("Email address"));
    await user.type(screen.getByLabelText("Email address"), "Pat@Example.com");
    await user.click(screen.getByRole("button", { name: "Email me a code" }));
    await screen.findByText(/we sent a 6 digit code/i);
    expect(api.requestLoginCode).toHaveBeenCalledWith("pat@example.com");

    await user.type(screen.getByLabelText("6 digit code"), "123456");
    await waitFor(() =>
      expect(api.verifyLoginCode).toHaveBeenCalledWith(
        "pat@example.com",
        "123456",
      ),
    );
    await waitFor(() => expect(p.onView).toHaveBeenCalledWith(claimed));
  });
});

describe("no_proceed", () => {
  it("is never a dead end: back, home and contact are offered", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    mount(
      node({
        id: "no_proceed_bmi",
        type: "no_proceed",
        title: "Not a fit right now",
        body: "Thanks for your honesty.",
      }),
      {
        onBack,
        disqualifyReason: "bmi_below_min",
      },
    );
    expect(
      screen.getByRole("heading", { name: "Not a fit right now" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /back to beema health/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /talk to our team/i }),
    ).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /change an answer/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it("captures an email for unavailable states", async () => {
    const user = userEvent.setup();
    const { onSubmit } = mount(
      node({
        id: "no_proceed_state",
        type: "no_proceed",
        title: "Not in your state yet",
        collect_email: true,
      }),
      { disqualifyReason: "state_unavailable" },
    );
    await user.type(screen.getByLabelText("Email address"), "nope");
    await user.click(screen.getByRole("button", { name: "Notify me" }));
    expect(onSubmit).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText("Email address"));
    await user.type(screen.getByLabelText("Email address"), "pat@example.com");
    await user.click(screen.getByRole("button", { name: "Notify me" }));
    expect(onSubmit).toHaveBeenCalledWith({ email: "pat@example.com" });
    expect((await screen.findByRole("status")).textContent).toMatch(
      /we will email you/i,
    );
  });
});

describe("thank_you", () => {
  it("links to the portal", () => {
    mount(
      node({ id: "thank_you", type: "thank_you", title: "You are all set" }),
    );
    expect(
      screen
        .getByRole("link", { name: /go to your portal/i })
        .getAttribute("href"),
    ).toBe("/portal");
  });
});
