import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  TEST_STATUSES,
  type Priority,
  type TestIdea,
  type TestStatus,
} from "@shared/types.ts";
import { api, ApiError } from "../api.ts";
import { go, useLab } from "../lab.tsx";
import {
  Button,
  Card,
  DemoChip,
  Empty,
  Field,
  IconButton,
  cx,
  inputCls,
} from "../ui.tsx";
import { ListChecks } from "lucide-react";

const TONE: Record<TestStatus, string> = {
  Idea: "text-faint",
  Planned: "text-sky",
  Building: "text-amber",
  Live: "text-teal",
  Completed: "text-soft",
};

export function QueueView() {
  const { state, mode, setState } = useLab();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    pageId: state!.pages[0].id,
    hypothesis: "",
    element: "",
    priority: "Medium" as Priority,
    expected: "",
  });

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      setState(await api.state(mode));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Action failed");
    }
  }
  const tests = [...state!.data.tests].sort(
    (a, b) => TEST_STATUSES.indexOf(a.status) - TEST_STATUSES.indexOf(b.status),
  );
  const pageTitle = (id: string) =>
    state!.pages.find((p) => p.id === id)?.title ?? id;

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Test queue</h1>
            {mode === "demo" && <DemoChip />}
          </div>
          <p className="mt-1 text-sm text-soft">
            Ideas to findings. Test one major variable at a time. Completing a
            test never ships anything.
          </p>
        </div>
        <Button variant="primary" onClick={() => setAdding((a) => !a)}>
          <Plus className="size-4" />
          New test
        </Button>
      </header>
      {error && (
        <p role="alert" className="text-sm text-rose">
          {error}
        </p>
      )}

      {adding && (
        <Card className="rise space-y-3 p-4">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await api.addTest(mode, draft);
                setAdding(false);
                setDraft({
                  ...draft,
                  hypothesis: "",
                  element: "",
                  expected: "",
                });
              });
            }}
          >
            <Field label="Landing page">
              <select
                className={inputCls}
                value={draft.pageId}
                onChange={(e) => setDraft({ ...draft, pageId: e.target.value })}
              >
                {state!.pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select
                className={inputCls}
                value={draft.priority}
                onChange={(e) =>
                  setDraft({ ...draft, priority: e.target.value as Priority })
                }
              >
                {["High", "Medium", "Low"].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Hypothesis">
                <textarea
                  required
                  rows={2}
                  maxLength={600}
                  className={inputCls}
                  value={draft.hypothesis}
                  onChange={(e) =>
                    setDraft({ ...draft, hypothesis: e.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="Element being tested">
              <input
                className={inputCls}
                maxLength={120}
                value={draft.element}
                onChange={(e) =>
                  setDraft({ ...draft, element: e.target.value })
                }
                placeholder="CTA wording"
              />
            </Field>
            <Field label="Expected outcome">
              <input
                className={inputCls}
                maxLength={300}
                value={draft.expected}
                onChange={(e) =>
                  setDraft({ ...draft, expected: e.target.value })
                }
              />
            </Field>
            <div className="flex justify-end gap-2 md:col-span-2">
              <Button type="button" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Add idea
              </Button>
            </div>
          </form>
        </Card>
      )}

      {tests.length === 0 ? (
        <Empty icon={<ListChecks className="size-8" />} title="No tests queued">
          Add an idea above. The next planned test shows up on each landing
          page.
        </Empty>
      ) : (
        <div className="space-y-3">
          {tests.map((t) => (
            <TestCard
              key={t.id}
              t={t}
              title={pageTitle(t.pageId)}
              open={open === t.id}
              toggle={() => setOpen(open === t.id ? null : t.id)}
              run={run}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TestCard({
  t,
  title,
  open,
  toggle,
  run,
}: {
  t: TestIdea;
  title: string;
  open: boolean;
  toggle: () => void;
  run: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const { mode } = useLab();
  const [f, setF] = useState({ findings: t.findings, followUp: t.followUp });
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{t.hypothesis}</p>
          <p className="mt-0.5 text-xs text-faint">
            <button
              className="cursor-pointer text-soft underline-offset-2 hover:text-teal hover:underline"
              onClick={() => go("page", t.pageId)}
            >
              {title}
            </button>
            {t.element && ` · ${t.element}`}
            {t.expected && ` · expects: ${t.expected}`}
          </p>
        </div>
        <select
          aria-label="Priority"
          value={t.priority}
          onChange={(e) =>
            run(() => api.patchTest(mode, t.id, { priority: e.target.value }))
          }
          className="rounded-md border border-line-strong bg-bg px-2 py-1 text-xs"
        >
          {["High", "Medium", "Low"].map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select
          aria-label="Status"
          value={t.status}
          onChange={(e) =>
            run(() => api.patchTest(mode, t.id, { status: e.target.value }))
          }
          className={cx(
            "rounded-md border border-line-strong bg-bg px-2 py-1 text-xs font-semibold",
            TONE[t.status],
          )}
        >
          {TEST_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <Button size="sm" onClick={toggle}>
          {open ? "Hide" : "Findings"}
        </Button>
        <IconButton
          label="Delete test"
          onClick={() =>
            confirm("Delete this test?") &&
            run(() => api.deleteTest(mode, t.id))
          }
        >
          <Trash2 className="size-4" />
        </IconButton>
      </div>
      {open && (
        <div className="rise mt-3 grid gap-3 border-t border-line pt-3 md:grid-cols-2">
          <Field label="Actual findings">
            <textarea
              rows={3}
              maxLength={2000}
              className={inputCls}
              value={f.findings}
              onChange={(e) => setF({ ...f, findings: e.target.value })}
            />
          </Field>
          <Field label="Follow-up recommendation">
            <textarea
              rows={3}
              maxLength={2000}
              className={inputCls}
              value={f.followUp}
              onChange={(e) => setF({ ...f, followUp: e.target.value })}
            />
          </Field>
          <div className="md:col-span-2 flex justify-end">
            <Button
              size="sm"
              variant="primary"
              onClick={() => run(() => api.patchTest(mode, t.id, f))}
            >
              Save
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
