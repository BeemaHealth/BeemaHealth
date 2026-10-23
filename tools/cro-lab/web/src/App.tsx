import {
  AlertTriangle,
  FlaskConical,
  LayoutGrid,
  ListChecks,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { go, useLab, useRoute } from "./lab.tsx";
import { GROUP_LABEL, saveGroup } from "./lib.ts";
import { Button, Card, DemoChip, Skeleton, cx } from "./ui.tsx";
import { Overview } from "./views/Overview.tsx";
import { PageView } from "./views/PageView.tsx";
import { QueueView } from "./views/QueueView.tsx";
import { api } from "./api.ts";
import { fmtDateTime } from "@shared/time.ts";

function Nav({ route }: { route: string[] }) {
  const { mode, setMode, state, setState } = useLab();
  const item = (active: boolean) =>
    cx(
      "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      active
        ? "bg-raised text-ink"
        : "text-soft hover:bg-raised/60 hover:text-ink",
    );
  return (
    <aside className="flex w-full shrink-0 flex-col gap-6 border-b border-line p-4 md:sticky md:top-0 md:h-screen md:w-60 md:border-b-0 md:border-r">
      <div className="flex items-center gap-2.5 px-1">
        <div className="grid size-8 place-items-center rounded-lg bg-teal/15 text-teal">
          <FlaskConical className="size-4.5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold">Beema CRO Lab</p>
          <p className="text-[11px] text-faint">Local only</p>
        </div>
      </div>
      <nav className="flex gap-1 md:flex-col" aria-label="Primary">
        <button className={item(route.length === 0)} onClick={() => go()}>
          <LayoutGrid className="size-4" />
          Overview
        </button>
        <button
          className={item(route[0] === "queue")}
          onClick={() => go("queue")}
        >
          <ListChecks className="size-4" />
          Test queue
        </button>
      </nav>
      {state && (
        <div className="hidden min-h-0 flex-1 space-y-4 overflow-y-auto md:block">
          {(["landing", "product"] as const).map((g) => (
            <nav key={g} aria-label={GROUP_LABEL[g]}>
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-widest text-faint">
                {GROUP_LABEL[g]}
              </p>
              {state.pages
                .filter((p) => p.group === g)
                .map((p) => (
                  <button
                    key={p.id}
                    className={cx(
                      "flex w-full cursor-pointer items-center rounded-md px-3 py-1.5 text-left text-[13px] transition-colors",
                      route[0] === "page" && route[1] === p.id
                        ? "bg-raised font-medium text-ink"
                        : "text-soft hover:bg-raised/60 hover:text-ink",
                    )}
                    onClick={() => {
                      saveGroup(g);
                      go("page", p.id);
                    }}
                  >
                    <span className="truncate">{p.title}</span>
                  </button>
                ))}
            </nav>
          ))}
        </div>
      )}
      <div className="mt-auto hidden space-y-3 md:block">
        <div
          role="group"
          aria-label="Data source"
          className="grid grid-cols-2 rounded-lg border border-line bg-bg p-0.5 text-xs font-semibold"
        >
          {(["demo", "live"] as const).map((m) => (
            <button
              key={m}
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={cx(
                "cursor-pointer rounded-md py-1.5 capitalize transition-colors",
                mode === m
                  ? "bg-raised text-ink"
                  : "text-faint hover:text-soft",
              )}
            >
              {m === "demo" ? "Demo data" : "Live data"}
            </button>
          ))}
        </div>
        {mode === "demo" && (
          <Button
            size="sm"
            variant="ghost"
            className="w-full"
            onClick={async () => {
              if (confirm("Reset all demo data to the original fixtures?"))
                setState(await api.resetDemo());
            }}
          >
            <RotateCcw className="size-3.5" />
            Reset demo
          </Button>
        )}
        {state && (
          <p className="px-1 text-[11px] leading-snug text-faint">
            Times shown in America/Denver.
          </p>
        )}
      </div>
    </aside>
  );
}

function Banner() {
  const { state, mode, reload, loading } = useLab();
  if (!state) return null;
  const a = state.analytics;
  return (
    <div
      className={cx(
        "flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-6 py-2 text-xs",
        mode === "demo"
          ? "border-amber/25 bg-amber/8 text-amber"
          : "border-line bg-surface/60 text-soft",
      )}
    >
      {mode === "demo" ? <DemoChip /> : <AlertTriangle className="size-3.5" />}
      <span className="flex-1">{a.message}</span>
      <span className="text-faint">
        {a.refreshedAt
          ? `Last pulled from GA4 ${fmtDateTime(a.refreshedAt)}`
          : ""}
      </span>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => void reload(true)}
        loading={loading}
        aria-label="Refresh data"
        title="Pull the most recent days from GA4 again. Opening or restarting the lab uses the saved data."
      >
        <RefreshCw className="size-3.5" />
        Refresh
      </Button>
    </div>
  );
}

export function App() {
  const route = useRoute();
  const { state, error, reload } = useLab();
  let body;
  if (error && !state) {
    body = (
      <Card className="mx-auto mt-24 max-w-md p-8 text-center">
        <AlertTriangle className="mx-auto mb-3 size-8 text-rose" />
        <p className="font-semibold">Can't load the lab</p>
        <p className="mt-1 text-sm text-soft">{error}</p>
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => void reload()}
        >
          Try again
        </Button>
      </Card>
    );
  } else if (!state) {
    body = (
      <div className="grid gap-4 p-6 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-56" />
        ))}
      </div>
    );
  } else if (route[0] === "page" && route[1])
    body = <PageView key={route[1]} pageId={route[1]} variantId={route[2]} />;
  else if (route[0] === "queue") body = <QueueView />;
  else body = <Overview />;
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Nav route={route} />
      <main className="min-w-0 flex-1">
        <Banner />
        {error && state && (
          <div
            role="alert"
            className="border-b border-rose/30 bg-rose/10 px-6 py-2 text-xs text-rose"
          >
            {error} Showing last loaded data.
          </div>
        )}
        {body}
      </main>
    </div>
  );
}
