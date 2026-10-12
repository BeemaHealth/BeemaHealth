import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/portal/client";
import {
  getCurrent,
  goBack,
  resumeOrStart,
  submitAnswer,
  type SubmissionView,
} from "@/lib/api/portal/questionnaire";
import { getPendingUtms } from "@/lib/utm";
import { Button } from "@/components/ui/button";
import { NodeRenderer } from "./NodeRenderer";
import { QuestionnaireShell } from "./QuestionnaireShell";
import { ErrorNote } from "./ui";

const FALLBACK_ERROR = "Something went wrong. Please try again.";

function messageFor(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 409 && err.code === "cannot_go_back")
      return "You cannot go back from here.";
    return err.message || fallback;
  }
  return fallback;
}

/**
 * Renders whatever node the server says is current. The client submits the current
 * node's answer and shows the node that comes back; nothing is cached in the browser, so
 * a refresh resumes from the server.
 */
export function QuestionnaireRunner({ slug }: { slug: string }) {
  const [view, setView] = useState<SubmissionView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const utm = getPendingUtms() as Record<string, string | undefined>;
      setView(await resumeOrStart(slug, utm));
    } catch (err) {
      setLoadError(messageFor(err, "We could not load this questionnaire."));
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const accept = useCallback((next: SubmissionView) => {
    setError(null);
    setView(next);
  }, []);

  const onSubmit = useCallback(
    async (value: unknown): Promise<boolean> => {
      if (!view || inflight.current) return false;
      inflight.current = true;
      setBusy(true);
      setError(null);
      try {
        accept(await submitAnswer(view.node.id, value));
        return true;
      } catch (err) {
        if (
          err instanceof ApiError &&
          err.status === 409 &&
          err.code === "node_mismatch"
        ) {
          // The server moved on (another tab). Re-sync instead of showing a stale step.
          await getCurrent()
            .then((next) => next && accept(next))
            .catch(() => undefined);
        }
        setError(messageFor(err, FALLBACK_ERROR));
        return false;
      } finally {
        inflight.current = false;
        setBusy(false);
      }
    },
    [view, accept],
  );

  const onBack = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    setBusy(true);
    setError(null);
    try {
      accept(await goBack());
    } catch (err) {
      setError(messageFor(err, "You cannot go back from here."));
    } finally {
      inflight.current = false;
      setBusy(false);
    }
  }, [accept]);

  const onRefresh = useCallback(async (): Promise<SubmissionView | null> => {
    const next = await getCurrent();
    if (next) setView(next);
    return next;
  }, []);

  if (loadError) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          We hit a snag
        </h1>
        <ErrorNote message={loadError} />
        <Button size="lg" onClick={() => void load()}>
          Try again
        </Button>
      </div>
    );
  }

  if (!view) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading"
        className="flex min-h-dvh items-center justify-center bg-background"
      >
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary motion-reduce:animate-none" />
      </div>
    );
  }

  return (
    <QuestionnaireShell
      layout={view.layout}
      progress={
        view.status === "submitted" || view.node.type === "thank_you"
          ? 1
          : view.progress
      }
      nodeId={view.node.id}
      nodeType={view.node.type}
      pathLength={view.path.length}
      onBack={() => void onBack()}
      backBusy={busy}
    >
      <NodeRenderer
        key={view.node.id}
        node={view.node}
        previous={view.previous_answer}
        layout={view.layout}
        busy={busy}
        error={error}
        onSubmit={onSubmit}
        onView={accept}
        onRefresh={onRefresh}
        disqualifyReason={view.disqualify_reason}
        onBack={
          view.node.type === "no_proceed" && view.path.length > 0
            ? () => void onBack()
            : undefined
        }
      />
    </QuestionnaireShell>
  );
}
