import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { TOOLS } from "@/content/tools/tools";

export function ToolsIndexView() {
  return (
    <MarketingLayout>
      <section className="bg-grad-hero pb-10 pt-14 md:pb-14 md:pt-20">
        <div className="veya-container">
          <div className="mx-auto max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Beema Health tools
            </p>
            <h1 className="mt-3 text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              Free tools to help you get your bearings
            </h1>
            <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
              Simple tools for general education. The BMI calculator keeps
              everything in your browser. The peptide quiz asks for your email
              before it shows your results. Neither replaces advice from a
              licensed clinician.
            </p>
          </div>
        </div>
      </section>

      <section className="pb-16 pt-2 md:pb-24">
        <div className="veya-container">
          <ul className="mx-auto grid max-w-3xl gap-5">
            {TOOLS.map((tool) => (
              <li key={tool.slug}>
                <Link
                  to={tool.path}
                  className="group block rounded-3xl border border-border bg-card p-6 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:p-8"
                >
                  <p className="text-sm text-muted-foreground">{tool.kind}</p>
                  <h2 className="mt-2 text-balance text-xl font-semibold tracking-tight text-foreground md:text-2xl">
                    {tool.title}
                  </h2>
                  <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
                    {tool.summary}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-foreground group-hover:text-primary">
                    Open tool
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </MarketingLayout>
  );
}
