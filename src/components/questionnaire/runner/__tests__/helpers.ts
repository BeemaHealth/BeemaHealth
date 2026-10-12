import { createElement, type ReactElement } from "react";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import type {
  LayoutConfig,
  QuestionnaireNode,
  SubmissionView,
} from "@/lib/api/portal/questionnaire";
import type { NodeRendererProps } from "../types";

/** jsdom has no matchMedia or ResizeObserver; motion and input-otp probe for them. */
export function installBrowserStubs(): void {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
  if (!("ResizeObserver" in globalThis)) {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
  }
  if (!document.elementFromPoint) document.elementFromPoint = () => null;
}

export const LAYOUT: LayoutConfig = {
  shell: { max_width: "640px", show_header: true, show_footer: true },
  back_button: { enabled: true, hidden_on_node_types: ["auth", "thank_you"] },
  footer: {
    legal_text: "Beema Health is a telehealth service.",
    links: [{ label: "Privacy", href: "/privacy" }],
  },
  copy: { continue: "Continue" },
  node_types: { safety_consent: { button_label: "I agree" } },
};

export function node(
  partial: Partial<QuestionnaireNode> & Pick<QuestionnaireNode, "id" | "type">,
): QuestionnaireNode {
  return { title: "Title", ...partial };
}

export function view(
  n: QuestionnaireNode,
  extra: Partial<SubmissionView> = {},
): SubmissionView {
  return {
    submission_id: "sub-1",
    status: "in_progress",
    node: n,
    path: [],
    progress: 0.2,
    layout: LAYOUT,
    claimed: false,
    previous_answer: null,
    ...extra,
  };
}

export function props(
  n: QuestionnaireNode,
  extra: Partial<NodeRendererProps> = {},
) {
  const onSubmit = vi.fn(async () => true);
  const full: NodeRendererProps = {
    node: n,
    previous: null,
    layout: LAYOUT,
    busy: false,
    error: null,
    onSubmit,
    onView: vi.fn(),
    onRefresh: vi.fn(async () => null),
    ...extra,
  };
  return { props: full, onSubmit: full.onSubmit as ReturnType<typeof vi.fn> };
}

export function renderEl(el: ReactElement) {
  return render(el);
}

export { createElement };
