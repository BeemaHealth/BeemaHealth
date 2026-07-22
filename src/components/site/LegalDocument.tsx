import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export type LegalSection = {
  id: string;
  title: string;
  content: ReactNode;
};

type LegalDocumentProps = {
  title: string;
  lastUpdated: string;
  description?: string;
  callout?: ReactNode;
  sections: LegalSection[];
  showToc?: boolean;
};

export function LegalDocument({
  title,
  lastUpdated,
  description,
  callout,
  sections,
  showToc = true,
}: LegalDocumentProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold text-foreground md:text-4xl">
        {title}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Last updated: {lastUpdated}
      </p>
      {description && (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {callout && (
        <div className="mt-6 rounded-2xl border border-border bg-muted/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          {callout}
        </div>
      )}

      {showToc && sections.length > 3 && (
        <nav
          aria-label="Table of contents"
          className="mt-8 rounded-2xl border border-border bg-background px-5 py-4"
        >
          <p className="text-sm font-semibold text-foreground">
            Table of contents
          </p>
          <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
            {sections.map((section, index) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="transition-colors hover:text-foreground"
                >
                  {index + 1}. {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="mt-10 space-y-10">
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className="text-lg font-semibold text-foreground">
              {section.title}
            </h2>
            <div
              className={cn(
                "mt-3 space-y-4 text-sm leading-relaxed text-muted-foreground",
                "legal-prose",
              )}
            >
              {section.content}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-12 border-t border-border pt-8 text-xs leading-relaxed text-muted-foreground">
        Questions about this document? Contact us at{" "}
        <a
          href="mailto:support@beemahealth.com"
          className="text-foreground underline-offset-2 hover:underline"
        >
          support@beemahealth.com
        </a>
        . See also our{" "}
        <Link
          to="/legal/privacy/"
          className="text-foreground underline-offset-2 hover:underline"
        >
          Privacy Policy
        </Link>
        ,{" "}
        <Link
          to="/legal/terms/"
          className="text-foreground underline-offset-2 hover:underline"
        >
          Terms of Service
        </Link>
        , and{" "}
        <Link
          to="/legal/telehealth-consent/"
          className="text-foreground underline-offset-2 hover:underline"
        >
          Telehealth Consent
        </Link>
        .
      </p>
    </div>
  );
}

export function LegalP({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
