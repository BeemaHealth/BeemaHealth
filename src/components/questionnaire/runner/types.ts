import type {
  LayoutConfig,
  QuestionnaireNode,
  SubmissionView,
} from "@/lib/api/portal/questionnaire";

/** Props every node renderer receives. Renderers never talk to the questionnaire API for answers. */
export type NodeRendererProps = {
  node: QuestionnaireNode;
  /** The server's stored answer for this node (resume and back), if any. */
  previous: unknown;
  layout: LayoutConfig;
  /** Disables inputs while an answer is in flight. */
  busy: boolean;
  /** Server error for the last submit, shown near the action. */
  error: string | null;
  /** Validated value up to the runner. Resolves true when the server accepted it. */
  onSubmit: (value: unknown) => Promise<boolean>;
  /** For nodes that complete through a different endpoint (auth claim, checkout). */
  onView: (view: SubmissionView) => void;
  /** Re-reads the current node from the server. */
  onRefresh: () => Promise<SubmissionView | null>;
  /** Disqualification context. */
  disqualifyReason?: string;
  /** Goes one step back (disqualification pages offer it). */
  onBack?: () => void;
};
