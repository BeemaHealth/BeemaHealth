import type { QuestionnaireFieldSchema } from "@/lib/api/client";

/** Stable top-to-bottom order for fields within a step. */
export function sortQuestionnaireFields(
  fields: QuestionnaireFieldSchema[],
): QuestionnaireFieldSchema[] {
  return [...fields].sort((a, b) => {
    const ao = a.sort_order ?? 0;
    const bo = b.sort_order ?? 0;
    if (ao !== bo) return ao - bo;
    return a.field_key.localeCompare(b.field_key);
  });
}
