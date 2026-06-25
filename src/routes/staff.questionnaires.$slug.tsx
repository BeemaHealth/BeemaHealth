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

export const Route = createFileRoute("/staff/questionnaires/$slug")({
  component: StaffQuestionnaireVersionsPage,
});

function StaffQuestionnaireVersionsPage() {
  const { slug } = Route.useParams();
  const [versions, setVersions] = useState<QuestionnaireVersionSchema[]>([]);

  async function reload() {
    const data = await fetchStaffQuestionnaireVersions(slug);
    setVersions(data);
  }

  useEffect(() => {
    void reload().catch(() => setVersions([]));
  }, [slug]);

  async function handleCreate() {
    await createStaffQuestionnaireVersion(slug, `draft-${versions.length + 1}`);
    await reload();
  }

  async function handlePublish(versionId: string) {
    await publishStaffQuestionnaireVersion(slug, versionId);
    await reload();
  }

  async function handleDuplicate(versionId: string) {
    await duplicateStaffQuestionnaireVersion(slug, versionId);
    await reload();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
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
      </div>
    </div>
  );
}
