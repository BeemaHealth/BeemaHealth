import { createFileRoute } from "@tanstack/react-router";
import { ToolsIndexView } from "@/components/tools/ToolsIndexView";
import { TOOLS_INDEX_PATH } from "@/content/tools/tools";
import { toolsDocumentMeta } from "@/lib/tools-seo";

const TITLE = "Free Health Tools | Beema Health";
const DESCRIPTION =
  "Free educational tools from Beema Health, including a BMI calculator and a peptide goal quiz. Nothing you enter is saved, and none of it is medical advice.";

export const Route = createFileRoute("/tools/")({
  head: () =>
    toolsDocumentMeta({
      title: TITLE,
      description: DESCRIPTION,
      path: TOOLS_INDEX_PATH,
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Tools", path: TOOLS_INDEX_PATH },
      ],
    }),
  component: ToolsIndexView,
});
