import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { TOOLS_INDEX_PATH, type ToolEntry } from "@/content/tools/tools";

/** Shared hero + breadcrumb for a single tool page. */
export function ToolPageShell({
  tool,
  heading,
  children,
}: {
  tool: ToolEntry;
  heading: string;
  children: ReactNode;
}) {
  return (
    <MarketingLayout>
      <section className="bg-grad-hero pb-10 pt-14 md:pb-14 md:pt-20">
        <div className="veya-container">
          <div className="mx-auto max-w-3xl">
            <Breadcrumb className="mb-6">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/">Home</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={TOOLS_INDEX_PATH}>Tools</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{tool.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              {heading}
            </h1>
            <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
              {tool.summary}
            </p>
          </div>
        </div>
      </section>
      <section className="pb-16 pt-2 md:pb-24">
        <div className="veya-container">{children}</div>
      </section>
    </MarketingLayout>
  );
}
