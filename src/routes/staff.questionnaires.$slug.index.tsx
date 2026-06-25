import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AccountSectionCard } from "@/components/portal/AccountSectionCard";
import { Button } from "@/components/ui/button";
import {
  createStaffQuestionnaireVersion,
  duplicateStaffQuestionnaireVersion,
  fetchStaffQuestionnaireVersions,
  publishStaffQuestionnaireVersion,
  type QuestionnaireVersionSchema,
} from "@/lib/api/client";

export const Route = createFileRoute("/staff/questionnaires/$slug/")({
  component: StaffQuestionnaireVersionsPage,
});

function StaffQuestionnaireVersionsPage() {
  const { slug } = Route.useParams();
  const [versions, setVersions] = useState<QuestionnaireVersionSchema[]>([]);
  const [error, setError] = useState("");

  async function reload() {
    const data = await fetchStaffQuestionnaireVersions(slug);
    setVersions(data);
  }

  useEffect(() => {
    void reload().catch(() => setVersions([]));
  }, [slug]);

  async function handleCreate() {
    try {
      await createStaffQuestionnaireVersion(
        slug,
        `draft-${versions.length + 1}`,
      );
      await reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create version.",
      );
    }
  }

  async function handlePublish(versionId: string) {
    try {
      await publishStaffQuestionnaireVersion(slug, versionId);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish.");
    }
  }

  async function handleDuplicate(versionId: string) {
    try {
      await duplicateStaffQuestionnaireVersion(slug, versionId);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to duplicate.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            to="/staff/questionnaires"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Questionnaires
          </Link>
          <h1 className="text-2xl font-bold text-foreground">
            {slug} versions
          </h1>
          <p className="text-sm text-muted-foreground">
            Draft, publish, and duplicate schemas.
          </p>
        </div>
        <Button size="sm" onClick={() => void handleCreate()}>
          New draft
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="space-y-3">
        {versions.map((v) => (
          <AccountSectionCard
            key={v.id}
            tone={v.status === "published" ? "consent" : "contact"}
            title={`v${v.version_label}`}
            description={`Status: ${v.status} · ${v.steps.length} steps`}
          >
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link
                  to="/staff/questionnaires/$slug/versions/$versionId"
                  params={{ slug, versionId: v.id }}
                >
                  Edit / preview
                </Link>
              </Button>
              {v.status === "draft" ? (
                <Button size="sm" onClick={() => void handlePublish(v.id)}>
                  Publish
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void handleDuplicate(v.id)}
              >
                Duplicate
              </Button>
            </div>
          </AccountSectionCard>
        ))}
        {versions.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No versions yet. Create a draft to get started.
          </p>
        )}
      </div>
    </div>
  );
}
