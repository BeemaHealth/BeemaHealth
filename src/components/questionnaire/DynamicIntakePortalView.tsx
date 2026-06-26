import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { AccountSectionCard } from "@/components/portal/AccountSectionCard";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { renderQuestionnaireField } from "@/components/questionnaire/FieldRegistry";
import { QuestionnaireLegalConsentSubmittedView } from "@/components/questionnaire/QuestionnaireLegalConsentSubmittedView";
import { QuestionnaireReviewSubmittedView } from "@/components/questionnaire/QuestionnaireReviewSubmittedView";
import {
  fetchActiveQuestionnaire,
  type QuestionnaireVersionSchema,
} from "@/lib/api/client";
import { getVisibleSteps } from "@/lib/questionnaire/validation";
import type { IntakeSubmissionSnapshot, MedicalIntake } from "@/lib/types/mvp";

type DynamicIntakePortalViewProps = {
  intake: MedicalIntake;
  submissionSnapshot?: IntakeSubmissionSnapshot | null;
  locked?: boolean;
  headerExtra?: ReactNode;
};

function isReviewField(fieldType: string, pluginId?: string | null): boolean {
  return (
    fieldType === "review" ||
    (fieldType === "plugin" && pluginId === "intake_review")
  );
}

export function DynamicIntakePortalView({
  intake,
  submissionSnapshot = null,
  locked = true,
  headerExtra,
}: DynamicIntakePortalViewProps) {
  const [schema, setSchema] = useState<QuestionnaireVersionSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const responses = (intake.questionnaire_responses ?? {}) as Record<
    string,
    unknown
  >;
  const submitted = locked && Boolean(submissionSnapshot);
  const confirmedAt =
    submissionSnapshot?.meta?.submitted_at ?? intake.submitted_at ?? null;
  const consentSignature =
    typeof submissionSnapshot?.consent?.typed_signature === "string"
      ? submissionSnapshot.consent.typed_signature
      : null;

  useEffect(() => {
    let cancelled = false;
    const versionId = intake.questionnaire_version_id;
    if (!versionId) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const active = await fetchActiveQuestionnaire("intake", versionId);
        if (!cancelled) setSchema(active);
      } catch {
        if (!cancelled)
          setError("Could not load submitted questionnaire version.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [intake.questionnaire_version_id]);

  const visibleSteps = useMemo(
    () => (schema ? getVisibleSteps(schema.steps, responses) : []),
    [schema, responses],
  );

  if (!intake.questionnaire_version_id || !intake.questionnaire_responses) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !schema) {
    return (
      <p className="text-sm text-destructive">
        {error || "Questionnaire unavailable."}
      </p>
    );
  }

  const versionLabel =
    submissionSnapshot?.dynamic_questionnaire?.version_label ??
    schema.version_label;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PortalPageHeader
        title="Medical intake"
        subtitle={`Dynamic questionnaire · version ${versionLabel}${locked ? " · read only" : ""}`}
      />
      {headerExtra}
      <div className="space-y-4">
        {visibleSteps.map((step) => {
          const answeredFields = step.fields.filter((f) => {
            const v = responses[f.field_key];
            return v !== undefined && v !== null && v !== "";
          });
          if (answeredFields.length === 0) return null;
          return (
            <AccountSectionCard
              key={step.step_key}
              title={step.title.replace(/<[^>]+>/g, "").trim() || step.step_key}
              description={step.subtitle?.replace(/<[^>]+>/g, "").trim()}
              tone="primary"
            >
              <div className="space-y-4">
                {answeredFields.map((field) => {
                  if (
                    submitted &&
                    isReviewField(field.field_type, field.plugin_id)
                  ) {
                    return (
                      <div key={field.field_key}>
                        {field.label ? (
                          <p className="mb-2 text-sm font-medium text-foreground">
                            {field.label}
                          </p>
                        ) : null}
                        <QuestionnaireReviewSubmittedView
                          confirmedAt={confirmedAt}
                          belugaPayload={
                            submissionSnapshot?.beluga_visit_payload ?? null
                          }
                        />
                      </div>
                    );
                  }

                  if (
                    submitted &&
                    field.field_type === "legal_consent" &&
                    responses[field.field_key] === true
                  ) {
                    return (
                      <div key={field.field_key}>
                        <QuestionnaireLegalConsentSubmittedView
                          agreedAt={confirmedAt}
                          signature={consentSignature}
                        />
                      </div>
                    );
                  }

                  return (
                    <div key={field.field_key}>
                      {renderQuestionnaireField(field, {
                        value: responses[field.field_key],
                        onChange: () => {},
                        readOnly: true,
                      })}
                    </div>
                  );
                })}
              </div>
            </AccountSectionCard>
          );
        })}
      </div>
    </div>
  );
}
