import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { PeptideQuiz } from "@/components/tools/PeptideQuiz";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { TOOLS_INDEX_PATH, getTool } from "@/content/tools/tools";
import { GOAL_CATEGORIES } from "@/lib/peptide-quiz";
import {
  BLOG_ARTICLE_PATH,
  CATEGORY_CONTENT,
  SIX_STEPS,
} from "@/lib/peptide-quiz-content";
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
      <QuizAbout />
    </ToolPageShell>
  );
}

/**
 * Public, crawlable context under the quiz. Search bots cannot pass the email
 * gate, so the topic coverage lives here in plain HTML. Only category titles
 * and one-line summaries appear; the gated results content does not.
 */
function QuizAbout() {
  return (
    <div className="mx-auto mt-14 max-w-2xl space-y-8">
      <section aria-labelledby="quiz-about-heading">
        <h2
          id="quiz-about-heading"
          className="text-2xl font-semibold tracking-tight text-foreground"
        >
          What this quiz covers
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Peptide is a broad term, and the right question depends on your goal.
          This quiz sorts your starting point into one of six areas and builds a
          reading list and a set of questions to bring to a licensed clinician.
          It does not recommend a medication or a dose.
        </p>
        <ul className="mt-4 space-y-3">
          {GOAL_CATEGORIES.map((category) => (
            <li key={category}>
              <h3 className="font-semibold text-foreground">
                {CATEGORY_CONTENT[category].title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {CATEGORY_CONTENT[category].summary}
              </p>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="quiz-steps-heading">
        <h2
          id="quiz-steps-heading"
          className="text-2xl font-semibold tracking-tight text-foreground"
        >
          The six steps behind it
        </h2>
        <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-muted-foreground">
          {SIX_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Read the full guide:{" "}
          <Link
            to={BLOG_ARTICLE_PATH}
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            How to choose the right peptide for your goals
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
