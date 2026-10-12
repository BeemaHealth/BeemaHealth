import { createFileRoute } from "@tanstack/react-router";
import { QuestionnaireRunner } from "@/components/questionnaire/runner/QuestionnaireRunner";

/**
 * Server-driven questionnaire (e.g. /start/weight_loss). The Django questionnaire engine
 * decides every step; this route only renders it. Checkout is a node inside the flow.
 */
export const Route = createFileRoute("/start/$slug")({
  component: StartQuestionnairePage,
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Get started | Beema Health" },
    ],
  }),
});

function StartQuestionnairePage() {
  const { slug } = Route.useParams();
  return <QuestionnaireRunner slug={slug} />;
}
