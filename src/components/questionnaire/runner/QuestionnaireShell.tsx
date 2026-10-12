import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Logo } from "@/components/brand/Logo";
import type { LayoutConfig, NodeType } from "@/lib/api/portal/questionnaire";

/** The layout config still points at short legal paths; the live routes live under /legal. */
const LINK_ALIASES: Record<string, string> = {
  "/privacy": "/legal/privacy",
  "/terms": "/legal/terms",
  "/telehealth-consent": "/legal/telehealth-consent",
};

export function resolveFooterHref(href: string): string {
  return LINK_ALIASES[href] ?? href;
}

export function showBackButton(
  layout: LayoutConfig,
  nodeType: NodeType,
  pathLength: number,
): boolean {
  if (layout.back_button?.enabled === false) return false;
  if (layout.back_button?.hidden_on_node_types?.includes(nodeType))
    return false;
  return pathLength > 0;
}

export function QuestionnaireShell({
  layout,
  progress,
  nodeId,
  nodeType,
  pathLength,
  onBack,
  backBusy,
  children,
}: {
  layout: LayoutConfig;
  progress: number;
  nodeId: string;
  nodeType: NodeType;
  pathLength: number;
  onBack: () => void;
  backBusy?: boolean;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const percent = Math.max(0, Math.min(100, Math.round(progress * 100)));
  const width =
    layout.node_types?.[nodeType]?.max_width ??
    layout.shell?.max_width ??
    "640px";
  const showHeader = layout.shell?.show_header !== false;
  const showFooter = layout.shell?.show_footer !== false;
  const back = showBackButton(layout, nodeType, pathLength);
  const footer = layout.footer;

  return (
    <div className="relative flex min-h-dvh flex-col bg-background text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-72 bg-gradient-to-b from-primary-soft/70 to-transparent"
      />
      {showHeader ? (
        <header
          className="relative z-10 mx-auto flex w-full items-center justify-between px-4 py-4 sm:px-6"
          style={{ maxWidth: "960px" }}
        >
          <a href="/" aria-label="Beema Health home">
            <Logo className="h-8 w-8" />
          </a>
        </header>
      ) : null}

      <div
        className="relative z-10 mx-auto w-full px-4 sm:px-6"
        style={{ maxWidth: width }}
      >
        <div
          role="progressbar"
          aria-label="Questionnaire progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
        >
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={false}
            animate={{ width: `${Math.max(percent, 3)}%` }}
            transition={
              reduce
                ? { duration: 0 }
                : { type: "spring", stiffness: 120, damping: 20 }
            }
          />
        </div>
        <div className="mt-3 h-9">
          {back ? (
            <button
              type="button"
              onClick={onBack}
              disabled={backBusy}
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {layout.copy?.back ?? "Back"}
            </button>
          ) : null}
        </div>
      </div>

      <main
        className="relative z-10 mx-auto w-full flex-1 px-4 pb-16 pt-4 sm:px-6 sm:pt-8"
        style={{ maxWidth: width }}
      >
        <motion.div
          key={nodeId}
          initial={reduce ? false : { opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: reduce ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </main>

      {showFooter ? (
        <footer
          className="relative z-10 mx-auto w-full px-4 pb-8 text-center text-xs leading-relaxed text-muted-foreground sm:px-6"
          style={{ maxWidth: "720px" }}
        >
          {footer?.privacy_text ? (
            <p className="font-medium text-foreground/80">
              {footer.privacy_text}
            </p>
          ) : null}
          {footer?.legal_text ? (
            <p className="mt-2">{footer.legal_text}</p>
          ) : null}
          {footer?.links?.length ? (
            <nav
              aria-label="Legal"
              className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1"
            >
              {footer.links.map((l) => (
                <a
                  key={l.href}
                  href={resolveFooterHref(l.href)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  {l.label}
                </a>
              ))}
            </nav>
          ) : null}
        </footer>
      ) : null}
    </div>
  );
}
