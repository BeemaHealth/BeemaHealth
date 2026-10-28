/** Tools hub registry: single source for the index cards, page meta and sitemap tests. */

export const TOOLS_INDEX_PATH = "/tools/";

export type ToolEntry = {
  slug: "bmi-calculator" | "peptide-quiz";
  path: string;
  title: string;
  /** Short label for the card eyebrow. */
  kind: string;
  /** Card and page intro copy. */
  summary: string;
  /** <title> without the site suffix. */
  metaTitle: string;
  metaDescription: string;
};

export const TOOLS: readonly ToolEntry[] = [
  {
    slug: "bmi-calculator",
    path: "/tools/bmi-calculator/",
    title: "BMI calculator",
    kind: "Calculator",
    summary:
      "Enter your height and weight to see where your Body Mass Index falls. It is a starting point for a conversation, not a diagnosis.",
    metaTitle: "BMI Calculator",
    metaDescription:
      "Free BMI calculator from Beema Health. Enter your height and weight to see your Body Mass Index. For general education only, not a diagnosis. Nothing you enter is saved.",
  },
  {
    slug: "peptide-quiz",
    path: "/tools/peptide-quiz/",
    title: "Which peptide fits your goal?",
    kind: "Quiz",
    summary:
      "Five short questions to work out what kind of peptide question you are asking, with a reading list and questions to bring to a clinician. It does not recommend a product.",
    metaTitle: "Peptide Goal Quiz",
    metaDescription:
      "A five-question educational quiz from Beema Health that points you to the right reading and questions for a clinician. It does not recommend a medication or dose. Answers are not saved.",
  },
] as const;

export function getTool(slug: ToolEntry["slug"]): ToolEntry {
  const tool = TOOLS.find((t) => t.slug === slug);
  if (!tool) throw new Error(`Unknown tool: ${slug}`);
  return tool;
}
