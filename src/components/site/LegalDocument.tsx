import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  BUSINESS_ADDRESS_LINE1,
  BUSINESS_ADDRESS_LINE2,
  LEGAL_BUSINESS_NAME,
  SUPPORT_EMAIL,
  SUPPORT_EMAIL_HREF,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_HREF,
} from "@/lib/contact-info";
import { SITE_URL } from "@/lib/seo";
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
          href={SUPPORT_EMAIL_HREF}
          className="text-foreground underline-offset-2 hover:underline"
        >
          {SUPPORT_EMAIL}
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
        ,{" "}
        <Link
          to="/legal/refund/"
          className="text-foreground underline-offset-2 hover:underline"
        >
          Refund Policy
        </Link>
        ,{" "}
        <Link
          to="/legal/shipping/"
          className="text-foreground underline-offset-2 hover:underline"
        >
          Shipping Policy
        </Link>
        ,{" "}
        <Link
          to="/legal/physician-code-of-conduct/"
          className="text-foreground underline-offset-2 hover:underline"
        >
          Physician Code of Conduct
        </Link>
        ,{" "}
        <Link
          to="/legal/hipaa/"
          className="text-foreground underline-offset-2 hover:underline"
        >
          HIPAA Privacy Policy
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

/** Standard business contact block for policy pages (address + phone + email). */
export function LegalBusinessContact() {
  return (
    <LegalP>
      {LEGAL_BUSINESS_NAME}
      <br />
      {BUSINESS_ADDRESS_LINE1}
      <br />
      {BUSINESS_ADDRESS_LINE2}
      <br />
      Phone:{" "}
      <a
        href={SUPPORT_PHONE_HREF}
        className="text-foreground underline-offset-2 hover:underline"
      >
        {SUPPORT_PHONE_DISPLAY}
      </a>
      <br />
      Email:{" "}
      <a
        href={SUPPORT_EMAIL_HREF}
        className="text-foreground underline-offset-2 hover:underline"
      >
        {SUPPORT_EMAIL}
      </a>
      <br />
      Website:{" "}
      <a
        href={SITE_URL}
        className="text-foreground underline-offset-2 hover:underline"
      >
        beemahealth.com
      </a>
    </LegalP>
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
