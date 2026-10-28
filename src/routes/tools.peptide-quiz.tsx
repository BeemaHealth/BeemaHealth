import { createFileRoute } from "@tanstack/react-router";
import { PeptideQuiz } from "@/components/tools/PeptideQuiz";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { TOOLS_INDEX_PATH, getTool } from "@/content/tools/tools";
import { toolsDocumentMeta } from "@/lib/tools-seo";

const tool = getTool("peptide-quiz");

export const Route = createFileRoute("/tools/peptide-quiz")({
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
  component: PeptideQuizPage,
});

function PeptideQuizPage() {
  return (
    <ToolPageShell tool={tool} heading="Which peptide fits your goal?">
      <PeptideQuiz />
    </ToolPageShell>
  );
}
