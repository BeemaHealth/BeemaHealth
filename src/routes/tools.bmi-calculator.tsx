import { createFileRoute } from "@tanstack/react-router";
import { BmiCalculator } from "@/components/site/BmiCalculator";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { TOOLS_INDEX_PATH, getTool } from "@/content/tools/tools";
import { CTA_IDS } from "@/lib/cta-ids";
import { toolsDocumentMeta } from "@/lib/tools-seo";

const tool = getTool("bmi-calculator");

export const Route = createFileRoute("/tools/bmi-calculator")({
  head: () =>
    toolsDocumentMeta({
      title: `${tool.metaTitle} | Beema Health`,
      description: tool.metaDescription,
      path: tool.path,
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Tools", path: TOOLS_INDEX_PATH },
        { name: tool.title, path: tool.path },
      ],
    }),
  component: BmiCalculatorPage,
});

function BmiCalculatorPage() {
  return (
    <ToolPageShell tool={tool} heading="BMI calculator">
      <div className="mx-auto max-w-5xl">
        <BmiCalculator ctaId={CTA_IDS.tools_bmi} />
      </div>
    </ToolPageShell>
  );
}
