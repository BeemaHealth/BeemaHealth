// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PeptideQuiz } from "@/components/tools/PeptideQuiz";
import {
  GOAL_CATEGORIES,
  QUIZ_LENGTH,
  QUIZ_QUESTIONS,
} from "@/lib/peptide-quiz";
import { QUIZ_FORMSPREE_ENDPOINT } from "@/lib/peptide-quiz-submit";
import {
  CATEGORY_CONTENT,
  QUIZ_DISCLAIMER,
  QUIZ_EMAIL_CONSENT,
  QUIZ_PRIVACY_NOTE,
  RESULT_PREVIEW,
} from "@/lib/peptide-quiz-content";
import { SITE_URL } from "@/lib/seo";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    search: _search,
    ...rest
  }: {
    to: string;
    children?: React.ReactNode;
    search?: unknown;
  } & Record<string, unknown>) =>
    createElement("a", { href: to, ...rest }, children),
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const read = (rel: string) => readFileSync(resolve(__dirname, rel), "utf-8");
const sitemapPaths = new Set(
  [...read("../../../public/sitemap.xml").matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (m) => m[1].slice(SITE_URL.length),
  ),
);

let container: HTMLDivElement;
let root: Root;
let fetchMock: ReturnType<typeof vi.fn>;

function render() {
  act(() => {
    root.render(createElement(PeptideQuiz));
  });
}
function radios(): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>('[role="radio"]')];
}
function button(label: RegExp): HTMLButtonElement {
  const found = [...container.querySelectorAll("button")].find((b) =>
    label.test(b.textContent ?? ""),
  );
  if (!found) throw new Error(`no button ${label}`);
  return found;
}
function click(el: HTMLElement) {
  act(() => {
    el.click();
  });
}
function answer(index: number) {
  click(radios()[index]);
  click(button(/^(Next|See your starting point)/));
}
function answerQuestions(goalIndex = 0) {
  answer(goalIndex);
  for (let i = 1; i < QUIZ_LENGTH; i += 1) answer(0);
}
function typeInto(selector: string, value: string) {
  const input = container.querySelector<HTMLInputElement>(selector);
  if (!input) throw new Error(`no input ${selector}`);
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function submitEmail(email: string) {
  typeInto("#quiz-email", email);
  const form = container.querySelector("form");
  if (!form) throw new Error("no form");
  await act(async () => {
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  });
}
async function completeQuiz(goalIndex = 0, email = "reader@example.com") {
  answerQuestions(goalIndex);
  await submitEmail(email);
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("PeptideQuiz questions", () => {
  it("shows one question at a time with progress, the disclaimer, and the privacy note", () => {
    render();
    const text = container.textContent ?? "";
    expect(text).toContain(`Question 1 of ${QUIZ_LENGTH}`);
    expect(text).toContain(QUIZ_QUESTIONS[0].prompt);
    expect(text).not.toContain(QUIZ_QUESTIONS[1].prompt);
    expect(text).toContain(QUIZ_DISCLAIMER);
    expect(text).toContain(QUIZ_PRIVACY_NOTE);
    expect(radios()).toHaveLength(QUIZ_QUESTIONS[0].options.length);
    expect(container.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  it("blocks Next until an answer is chosen and disables Back on question 1", () => {
    render();
    expect(button(/^Next/).disabled).toBe(true);
    expect(button(/Back/).disabled).toBe(true);
    click(radios()[0]);
    expect(button(/^Next/).disabled).toBe(false);
  });

  it("goes back and keeps the earlier answer selected", () => {
    render();
    answer(2);
    expect(container.textContent).toContain(`Question 2 of ${QUIZ_LENGTH}`);
    click(button(/Back/));
    expect(container.textContent).toContain(`Question 1 of ${QUIZ_LENGTH}`);
    expect(radios()[2].getAttribute("aria-checked")).toBe("true");
  });
});

describe("PeptideQuiz email gate", () => {
  it("asks for an email after the last question and shows no results or network call yet", () => {
    render();
    answerQuestions(0);
    const text = container.textContent ?? "";
    expect(text).toContain("See your starting point");
    expect(text).toContain(QUIZ_EMAIL_CONSENT);
    expect(text).toContain("Your results are ready");
    expect(text).not.toMatch(/send your results|email you|your inbox/i);
    for (const item of RESULT_PREVIEW) expect(text).toContain(item);
    expect(text).toContain(CATEGORY_CONTENT.weight_metabolic.title);
    expect(text).toContain(QUIZ_DISCLAIMER);
    expect(text).not.toContain("What the evidence looks like for this goal");
    expect(container.querySelector("#quiz-email")).not.toBeNull();
    expect(container.querySelector('a[href="/legal/privacy/"]')).not.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid email without sending anything", async () => {
    render();
    answerQuestions(0);
    await submitEmail("not-an-email");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "valid email",
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain(
      "What the evidence looks like for this goal",
    );
  });

  it("sends only the email to Formspree, then shows the results", async () => {
    render();
    await completeQuiz(0, "reader@example.com");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(QUIZ_FORMSPREE_ENDPOINT);
    const body = JSON.parse(init.body);
    expect(body).toEqual({
      _subject: "Peptide quiz email",
      source: "tools/peptide-quiz",
      email: "reader@example.com",
    });
    // No quiz answer or category may leave the browser.
    expect(init.body).not.toMatch(
      /Weight and metabolic|weight_metabolic|goal/i,
    );
    const text = container.textContent ?? "";
    expect(text).toContain("Your starting point");
    expect(text).toContain(CATEGORY_CONTENT.weight_metabolic.title);
    expect(text).toContain("What the evidence looks like for this goal");
    expect(text).toContain("Questions to bring to a clinician");
    expect(text).toContain(QUIZ_DISCLAIMER);
  });

  it("withholds results and offers a retry when sending fails", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    render();
    await completeQuiz(0);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "could not send",
    );
    expect(container.textContent).not.toContain(
      "What the evidence looks like for this goal",
    );
    await submitEmail("reader@example.com");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain(
      "What the evidence looks like for this goal",
    );
  });

  it("silently skips sending when the honeypot is filled", async () => {
    render();
    answerQuestions(0);
    typeInto('input[name="company"]', "Bot Inc");
    await submitEmail("bot@example.com");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("goes back from the gate to the last question without losing answers", () => {
    render();
    answerQuestions(0);
    click(button(/Back/));
    expect(container.textContent).toContain(
      `Question ${QUIZ_LENGTH} of ${QUIZ_LENGTH}`,
    );
    expect(radios()[0].getAttribute("aria-checked")).toBe("true");
  });
});

describe("PeptideQuiz results", () => {
  it("start over resets to question 1 and requires the email again", async () => {
    render();
    await completeQuiz(0);
    click(button(/Start over/));
    expect(container.textContent).toContain(`Question 1 of ${QUIZ_LENGTH}`);
    expect(
      radios().every((r) => r.getAttribute("aria-checked") === "false"),
    ).toBe(true);
    answerQuestions(0);
    expect(container.textContent).toContain("See your starting point");
  });

  it("sends the weight-goal CTA to Bask intake through resolveCta, never a hardcoded link", async () => {
    render();
    await completeQuiz(0);
    const cta = [...container.querySelectorAll("a")].find((a) =>
      /Get Started/.test(a.textContent ?? ""),
    );
    expect(cta?.getAttribute("href")).toMatch(
      /^https:\/\/q\.beemahealth\.com\//,
    );
    const src = read("../../components/tools/PeptideQuiz.tsx");
    expect(src).toContain("resolveCta(CTA_IDS.tools_peptide_quiz)");
    expect(src).not.toMatch(/https?:\/\//);
  });

  it("renders every category result without dashes, Rx brand names, or review claims", async () => {
    const banned =
      /—|–|wegovy|ozempic|zepbound|mounjaro|saxenda|medically reviewed|reviewed by|best for you|right for you|recommended for you|guaranteed safe|\bBeema\b(?! Health)/i;
    for (let g = 0; g < GOAL_CATEGORIES.length; g += 1) {
      render();
      await completeQuiz(g);
      expect(container.textContent ?? "").not.toMatch(banned);
      click(button(/Start over/));
    }
  });

  it("only links to pages that are in the sitemap", () => {
    for (const category of GOAL_CATEGORIES) {
      for (const link of CATEGORY_CONTENT[category].links) {
        expect(sitemapPaths.has(link.to), `${category}: ${link.to}`).toBe(true);
      }
    }
    expect(sitemapPaths.has("/legal/privacy/")).toBe(true);
  });
});

describe("PeptideQuiz data handling", () => {
  it("does not touch localStorage or sessionStorage, including while submitting", async () => {
    const spies = (["getItem", "setItem", "removeItem", "clear"] as const).map(
      (method) => vi.spyOn(Storage.prototype, method),
    );
    render();
    await completeQuiz(1);
    click(button(/Start over/));
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });

  it("keeps storage, analytics, and pixel calls out of the quiz sources", () => {
    for (const file of [
      "../../components/tools/PeptideQuiz.tsx",
      "../peptide-quiz-submit.ts",
      "../peptide-quiz.ts",
    ]) {
      expect(read(file), file).not.toMatch(
        /localStorage|sessionStorage|indexedDB|trackPage|trackFunnel|trackEvent|trackIntake|sendBeacon|gtag|fbq|dataLayer/,
      );
    }
    // The only network call lives in the submit helper.
    expect(read("../../components/tools/PeptideQuiz.tsx")).not.toMatch(
      /fetch\(/,
    );
  });

  it("includes no dashes or Rx brand names in the quiz sources", () => {
    for (const file of [
      "../peptide-quiz.ts",
      "../peptide-quiz-content.ts",
      "../peptide-quiz-submit.ts",
      "../../content/tools/tools.ts",
      "../../components/tools/PeptideQuiz.tsx",
      "../../components/tools/ToolsIndexView.tsx",
    ]) {
      const src = read(file);
      expect(src, file).not.toMatch(/—|–/);
      expect(src, file).not.toMatch(/wegovy|ozempic|zepbound|mounjaro/i);
    }
  });
});
