import { createFileRoute, Link } from "@tanstack/react-router";
import { FlowchartBuilder } from "@/components/questionnaire/FlowchartBuilder";

export const Route = createFileRoute(
  "/staff/questionnaires/$slug/versions/$versionId",
)({
  component: StaffQuestionnaireBuilderPage,
});

function StaffQuestionnaireBuilderPage() {
  const { slug, versionId } = Route.useParams();

  return (
    <div className="space-y-3">
      <Link
        to="/staff/questionnaires/$slug"
        params={{ slug }}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← {slug} versions
      </Link>
      <FlowchartBuilder slug={slug} versionId={versionId} />
    </div>
  );
}
