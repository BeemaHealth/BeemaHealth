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
import {
  CATEGORY_CONTENT,
  QUIZ_DISCLAIMER,
  QUIZ_PRIVACY_NOTE,
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

const sitemapXml = readFileSync(
  resolve(__dirname, "../../../public/sitemap.xml"),
  "utf-8",
);
const sitemapPaths = new Set(
  [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
    m[1].slice(SITE_URL.length),
  ),
);

let container: HTMLDivElement;
let root: Root;

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
/** Answer the current question with the option at `index`, then continue. */
function answer(index: number) {
  click(radios()[index]);
  click(button(/^(Next|See your starting point)/));
}
function answerAll(goalIndex = 0) {
  answer(goalIndex);
  for (let i = 1; i < QUIZ_LENGTH; i += 1) answer(0);
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("PeptideQuiz", () => {
  it("shows one question at a time with progress and the disclaimer", () => {
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

  it("renders results with disclaimer, sections, and a start over that resets", () => {
    render();
    answerAll(0);
    const text = container.textContent ?? "";
    expect(text).toContain("Your starting point");
    expect(text).toContain(CATEGORY_CONTENT.weight_metabolic.title);
    expect(text).toContain("What the evidence looks like for this goal");
    expect(text).toContain("Questions to bring to a clinician");
    expect(text).toContain(QUIZ_DISCLAIMER);
    expect(text).toContain(QUIZ_PRIVACY_NOTE);
    click(button(/Start over/));
    expect(container.textContent).toContain(`Question 1 of ${QUIZ_LENGTH}`);
    expect(
      radios().every((r) => r.getAttribute("aria-checked") === "false"),
    ).toBe(true);
  });

  it("sends the weight-goal CTA to Bask intake through resolveCta, never a hardcoded link", () => {
    render();
    answerAll(0);
    const cta = [...container.querySelectorAll("a")].find((a) =>
      /Get Started/.test(a.textContent ?? ""),
    );
    expect(cta?.getAttribute("href")).toMatch(
      /^https:\/\/q\.beemahealth\.com\//,
    );
    const src = readFileSync(
      resolve(__dirname, "../../components/tools/PeptideQuiz.tsx"),
      "utf-8",
    );
    expect(src).toContain("resolveCta(CTA_IDS.tools_peptide_quiz)");
    expect(src).not.toMatch(/https?:\/\//);
  });

  it("does not touch localStorage or sessionStorage", () => {
    const spies = (
      ["getItem", "setItem", "removeItem", "clear"] as const
    ).flatMap((method) => [vi.spyOn(Storage.prototype, method)]);
    render();
    answerAll(1);
    click(button(/Start over/));
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    const src = readFileSync(
      resolve(__dirname, "../../components/tools/PeptideQuiz.tsx"),
      "utf-8",
    );
    expect(src).not.toMatch(
      /localStorage|sessionStorage|indexedDB|fetch\(|trackPage|trackFunnel|trackEvent|sendBeacon/,
    );
  });

  it("renders every category result without dashes, Rx brand names, or review claims", () => {
    const banned =
      /—|–|wegovy|ozempic|zepbound|mounjaro|saxenda|medically reviewed|reviewed by|best for you|right for you|recommended for you|guaranteed safe|\bBeema\b(?! Health)/i;
    for (let g = 0; g < GOAL_CATEGORIES.length; g += 1) {
      render();
      answerAll(g);
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
  });

  it("includes no dashes or brand names in the static quiz sources", () => {
    for (const file of [
      "../peptide-quiz.ts",
      "../peptide-quiz-content.ts",
      "../../content/tools/tools.ts",
      "../../components/tools/PeptideQuiz.tsx",
      "../../components/tools/ToolsIndexView.tsx",
    ]) {
      const src = readFileSync(resolve(__dirname, file), "utf-8");
      expect(src, file).not.toMatch(/—|–/);
      expect(src, file).not.toMatch(/wegovy|ozempic|zepbound|mounjaro/i);
    }
  });
});
