import { Link } from "@tanstack/react-router";
import { citationRel } from "@/lib/outbound-links";
import type { BlogInline } from "@/content/blog/types";

const linkClass =
  "font-medium text-foreground underline decoration-foreground/30 underline-offset-4 hover:text-primary hover:decoration-primary";

export function BlogRichText({ inlines }: { inlines: readonly BlogInline[] }) {
  return (
    <>
      {inlines.map((inline, index) => {
        if (inline.type === "text")
          return <span key={index}>{inline.value}</span>;
        if (inline.type === "strong") {
          return (
            <strong key={index} className="font-semibold text-foreground">
              {inline.value}
            </strong>
          );
        }
        if (inline.href.startsWith("/")) {
          return (
            <Link key={index} to={inline.href} className={linkClass}>
              {inline.label}
            </Link>
          );
        }
        return (
          <a
            key={index}
            href={inline.href}
            target="_blank"
            rel={citationRel(inline.href)}
            className={linkClass}
          >
            {inline.label}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        );
      })}
    </>
  );
}
