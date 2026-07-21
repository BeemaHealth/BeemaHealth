import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, ChevronUp } from "lucide-react";
import { AccountSectionCard } from "@/components/portal/AccountSectionCard";
import { Button } from "@/components/ui/button";
import { Field, inputCls } from "@/components/quiz/quiz-primitives";
import {
  archiveStaffQuestionnaireVersion,
  createStaffQuestionnaireVersion,
  deleteStaffQuestionnaire,
  deleteStaffQuestionnaireVersion,
  duplicateStaffQuestionnaire,
  duplicateStaffQuestionnaireVersion,
  exportStaffQuestionnaireVersion,
  fetchStaffQuestionnaire,
  fetchStaffQuestionnaireVersions,
  importStaffQuestionnaireVersion,
  publishStaffQuestionnaireVersion,
  updateStaffQuestionnaire,
  updateStaffQuestionnaireVersion,
  type QuestionnaireListItem,
  type QuestionnaireVersionSchema,
} from "@/lib/api/client";

export const Route = createFileRoute("/staff/questionnaires/$slug/")({
  component: StaffQuestionnaireVersionsPage,
});

import {
  bumpVersionLabel,
  parseVersionNumber,
} from "@/lib/questionnaire/version-label";

function VersionLabelEditor({
  version,
  slug,
  onSaved,
  onError,
}: {
  version: QuestionnaireVersionSchema;
  slug: string;
  onSaved: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [value, setValue] = useState(version.version_label);
  const [saving, setSaving] = useState(false);
  const dirty = value.trim() !== version.version_label;

  useEffect(() => {
    setValue(version.version_label);
  }, [version.version_label]);

  async function saveLabel(nextLabel: string) {
    const label = nextLabel.trim().slice(0, 32);
    if (!label) {
      onError("Version name cannot be empty.");
      return;
    }
    if (label === version.version_label) {
      setValue(version.version_label);
      return;
    }
    setSaving(true);
    onError("");
    try {
      await updateStaffQuestionnaireVersion(slug, version.id, {
        version_label: label,
      });
      await onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to rename.");
      setValue(version.version_label);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Version</span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-8"
          disabled={saving}
          aria-label="Decrease version number"
          onClick={() => {
            const next = bumpVersionLabel(value, -1);
            setValue(next);
            void saveLabel(next);
          }}
        >
          <ChevronDown className="size-4" />
        </Button>
        <input
          className="w-28 rounded-lg border border-input bg-background px-2.5 py-1.5 text-center text-sm text-foreground"
          value={value}
          maxLength={32}
          disabled={saving}
          aria-label="Version label"
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            if (dirty) void saveLabel(value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void saveLabel(value);
            }
            if (e.key === "Escape") {
              setValue(version.version_label);
            }
          }}
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-8"
          disabled={saving}
          aria-label="Increase version number"
          onClick={() => {
            const next = bumpVersionLabel(value, 1);
            setValue(next);
            void saveLabel(next);
          }}
        >
          <ChevronUp className="size-4" />
        </Button>
      </div>
      {dirty ? (
        <Button
          size="sm"
          disabled={saving}
          onClick={() => void saveLabel(value)}
        >
          {saving ? "Saving…" : "Save label"}
        </Button>
      ) : saving ? (
        <span className="text-xs text-muted-foreground">Saving…</span>
      ) : null}
    </div>
  );
}

const QUESTIONNAIRE_TITLE_MAX_LENGTH = 128;

function QuestionnaireTitleEditor({
  questionnaire,
  onSaved,
  onError,
}: {
  questionnaire: QuestionnaireListItem;
  onSaved: (updated: QuestionnaireListItem) => void;
  onError: (message: string) => void;
}) {
  const [value, setValue] = useState(questionnaire.title);
  const [saving, setSaving] = useState(false);
  const dirty = value.trim() !== questionnaire.title;

  useEffect(() => {
    setValue(questionnaire.title);
  }, [questionnaire.title]);

  async function saveTitle(nextTitle: string) {
    const title = nextTitle.trim().slice(0, QUESTIONNAIRE_TITLE_MAX_LENGTH);
    if (!title) {
      onError("Title cannot be empty.");
      return;
    }
    if (title === questionnaire.title) {
      setValue(questionnaire.title);
      return;
    }
    setSaving(true);
    onError("");
    try {
      const updated = await updateStaffQuestionnaire(questionnaire.slug, {
        title,
      });
      onSaved(updated);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to rename title.");
      setValue(questionnaire.title);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Title</span>
      <input
        className="min-w-[12rem] flex-1 rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm text-foreground"
        value={value}
        maxLength={QUESTIONNAIRE_TITLE_MAX_LENGTH}
        disabled={saving}
        aria-label="Questionnaire title"
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (dirty) void saveTitle(value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void saveTitle(value);
          }
          if (e.key === "Escape") {
            setValue(questionnaire.title);
          }
        }}
      />
      {dirty ? (
        <Button
          size="sm"
          disabled={saving}
          onClick={() => void saveTitle(value)}
        >
          {saving ? "Saving…" : "Save title"}
        </Button>
      ) : saving ? (
        <span className="text-xs text-muted-foreground">Saving…</span>
      ) : null}
    </div>
  );
}

function QuestionnaireSlugEditor({
  questionnaire,
  onSaved,
  onError,
}: {
  questionnaire: QuestionnaireListItem;
  onSaved: (updated: QuestionnaireListItem) => void;
  onError: (message: string) => void;
}) {
  const navigate = useNavigate();
  const [value, setValue] = useState(questionnaire.slug);
  const [saving, setSaving] = useState(false);
  const dirty = value.trim() !== questionnaire.slug;

  useEffect(() => {
    setValue(questionnaire.slug);
  }, [questionnaire.slug]);

  async function saveSlug(nextSlug: string) {
    const slug = nextSlug.trim().toLowerCase().slice(0, 64);
    if (!slug) {
      onError("Slug cannot be empty.");
      return;
    }
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(slug)) {
      onError(
        "Slug must be lowercase letters, numbers, hyphens, or underscores.",
      );
      return;
    }
    if (slug === questionnaire.slug) {
      setValue(questionnaire.slug);
      return;
    }
    setSaving(true);
    onError("");
    try {
      const updated = await updateStaffQuestionnaire(questionnaire.slug, {
        slug,
      });
      onSaved(updated);
      void navigate({
        to: "/staff/questionnaires/$slug",
        params: { slug: updated.slug },
        replace: true,
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to rename slug.");
      setValue(questionnaire.slug);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Slug</span>
      <input
        className="min-w-[12rem] flex-1 rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm text-foreground"
        value={value}
        maxLength={64}
        pattern="[a-z0-9][a-z0-9\-_]*"
        disabled={saving}
        aria-label="Questionnaire slug"
        onChange={(e) => setValue(e.target.value.toLowerCase())}
        onBlur={() => {
          if (dirty) void saveSlug(value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void saveSlug(value);
          }
          if (e.key === "Escape") {
            setValue(questionnaire.slug);
          }
        }}
      />
      {dirty ? (
        <Button
          size="sm"
          disabled={saving}
          onClick={() => void saveSlug(value)}
        >
          {saving ? "Saving…" : "Save slug"}
        </Button>
      ) : saving ? (
        <span className="text-xs text-muted-foreground">Saving…</span>
      ) : null}
    </div>
  );
}

function StaffQuestionnaireVersionsPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [questionnaire, setQuestionnaire] =
    useState<QuestionnaireListItem | null>(null);
  const [versions, setVersions] = useState<QuestionnaireVersionSchema[]>([]);
  const [error, setError] = useState("");
  const [duplicating, setDuplicating] = useState(false);
  const [exportingVersionId, setExportingVersionId] = useState<string | null>(
    null,
  );
  const [importText, setImportText] = useState("");
  const [importVersionLabel, setImportVersionLabel] = useState("");
  const [importing, setImporting] = useState(false);

  async function reload() {
    const [meta, data] = await Promise.all([
      fetchStaffQuestionnaire(slug),
      fetchStaffQuestionnaireVersions(slug),
    ]);
    setQuestionnaire(meta);
    setVersions(data);
  }

  useEffect(() => {
    void reload().catch(() => setVersions([]));
  }, [slug]);

  function uniqueDraftName() {
    const used = new Set(versions.map((v) => v.version_label));
    let n = versions.length + 1;
    let name = `draft-${n}`;
    while (used.has(name)) {
      n += 1;
      name = `draft-${n}`;
    }
    return name;
  }

  async function handleCreate() {
    setError("");
    try {
      await createStaffQuestionnaireVersion(slug, uniqueDraftName());
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

  async function handleExport(version: QuestionnaireVersionSchema) {
    setError("");
    setExportingVersionId(version.id);
    try {
      const bundle = await exportStaffQuestionnaireVersion(slug, version.id);
      const fileSlug = bundle.questionnaire.slug || slug;
      const fileLabel = version.version_label.replace(/[^a-z0-9_.-]+/gi, "-");
      const blob = new Blob([JSON.stringify(bundle, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileSlug}-v${fileLabel}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export JSON.");
    } finally {
      setExportingVersionId(null);
    }
  }

  async function handleImport() {
    setError("");
    let bundle: Record<string, unknown>;
    try {
      bundle = JSON.parse(importText) as Record<string, unknown>;
    } catch {
      setError("Import JSON is not valid.");
      return;
    }
    setImporting(true);
    try {
      await importStaffQuestionnaireVersion(
        slug,
        bundle,
        importVersionLabel || undefined,
      );
      setImportText("");
      setImportVersionLabel("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import JSON.");
    } finally {
      setImporting(false);
    }
  }

  async function handleImportFile(file: File | null) {
    if (!file) return;
    if (file.type && file.type !== "application/json") {
      setError("Choose a JSON file exported from Beema Health.");
      return;
    }
    setError("");
    setImportText(await file.text());
  }

  async function handleArchive(versionId: string) {
    setError("");
    try {
      await archiveStaffQuestionnaireVersion(slug, versionId);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive.");
    }
  }

  async function handleDelete(version: QuestionnaireVersionSchema) {
    const kind = version.status === "archived" ? "archived" : "draft";
    if (
      !window.confirm(
        `Delete ${kind} version “${version.version_label}”? This cannot be undone.`,
      )
    ) {
      return;
    }
    setError("");
    try {
      await deleteStaffQuestionnaireVersion(slug, version.id);
      await reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete version.",
      );
    }
  }

  async function handleDuplicateQuestionnaire() {
    if (
      !window.confirm(
        `Duplicate questionnaire “${questionnaire?.title ?? slug}”? All versions will be copied as drafts under a new slug.`,
      )
    ) {
      return;
    }
    setError("");
    setDuplicating(true);
    try {
      const clone = await duplicateStaffQuestionnaire(slug);
      void navigate({
        to: "/staff/questionnaires/$slug",
        params: { slug: clone.slug },
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to duplicate questionnaire.",
      );
    } finally {
      setDuplicating(false);
    }
  }

  async function handleDeleteQuestionnaire() {
    if (
      !window.confirm(
        `Delete questionnaire “${questionnaire?.title ?? slug}” and all of its versions? This cannot be undone.`,
      )
    ) {
      return;
    }
    setError("");
    try {
      await deleteStaffQuestionnaire(slug);
      void navigate({ to: "/staff/questionnaires" });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete questionnaire.",
      );
    }
  }

  const publishedCount = versions.filter(
    (v) => v.status === "published",
  ).length;

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
            {questionnaire?.title ?? slug}
          </h1>
          <p className="text-sm text-muted-foreground">
            Draft, publish, rename, and duplicate schemas.
          </p>
        </div>
        <Button size="sm" onClick={() => void handleCreate()}>
          New draft
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {questionnaire ? (
        <AccountSectionCard
          tone="primary"
          title="Questionnaire settings"
          description={`Type: ${questionnaire.questionnaire_type}${
            questionnaire.medication
              ? ` · ${questionnaire.medication.name}`
              : " · Default"
          }`}
        >
          <div className="space-y-3">
            <QuestionnaireTitleEditor
              questionnaire={questionnaire}
              onSaved={setQuestionnaire}
              onError={setError}
            />
            <QuestionnaireSlugEditor
              questionnaire={questionnaire}
              onSaved={setQuestionnaire}
              onError={setError}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={duplicating}
                onClick={() => void handleDuplicateQuestionnaire()}
              >
                {duplicating ? "Duplicating…" : "Duplicate questionnaire"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive"
                onClick={() => void handleDeleteQuestionnaire()}
              >
                Delete questionnaire
              </Button>
            </div>
          </div>
        </AccountSectionCard>
      ) : null}

      <AccountSectionCard
        tone="contact"
        title="Export / import JSON"
        description="Move a tested questionnaire version between environments. Imports always create a new draft."
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Export the version you tested locally, then import that JSON on
            production as a draft. Publishing remains a separate step so CTA
            ownership changes are explicit.
          </p>
          <Field label="Import JSON file">
            <input
              className={inputCls}
              type="file"
              accept="application/json,.json"
              disabled={importing}
              onChange={(e) => {
                void handleImportFile(e.target.files?.[0] ?? null);
                e.currentTarget.value = "";
              }}
            />
          </Field>
          <Field label="Or paste export JSON">
            <textarea
              className={`${inputCls} min-h-32 font-mono text-xs`}
              value={importText}
              disabled={importing}
              placeholder='{"schema_version":1,"questionnaire":{...},"version":{...}}'
              onChange={(e) => setImportText(e.target.value)}
            />
          </Field>
          <Field label="Version label override (optional)">
            <input
              className={inputCls}
              value={importVersionLabel}
              maxLength={32}
              disabled={importing}
              placeholder="e.g. prod-facebook-test"
              onChange={(e) => setImportVersionLabel(e.target.value)}
            />
          </Field>
          <Button
            size="sm"
            disabled={importing || !importText.trim()}
            onClick={() => void handleImport()}
          >
            {importing ? "Importing…" : "Import as draft"}
          </Button>
        </div>
      </AccountSectionCard>

      {publishedCount > 1 ? (
        <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-foreground">
          {publishedCount} versions are published at once. Patients enter the
          most recently published version (or the one mapped to their CTA).
          Archive the versions you no longer want live.
        </p>
      ) : null}

      <div className="space-y-3">
        {versions.map((v) => (
          <AccountSectionCard
            key={v.id}
            tone={v.status === "published" ? "consent" : "contact"}
            title={`v${v.version_label}`}
            description={`Status: ${v.status} · ${v.steps.length} steps${
              v.is_in_use ? " · in use" : ""
            }${
              v.vendor_version_info
                ? ` · ${v.vendor_version_info.vendor_name} · ${v.vendor_version_info.display_label}`
                : ""
            }`}
          >
            <VersionLabelEditor
              version={v}
              slug={slug}
              onSaved={reload}
              onError={setError}
            />
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
              {(v.status === "draft" ||
                (v.status === "archived" && !v.is_in_use)) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => void handleDelete(v)}
                >
                  Delete
                </Button>
              )}
              {v.status === "archived" && v.is_in_use ? (
                <span className="self-center text-xs text-muted-foreground">
                  Used by patients, cannot delete
                </span>
              ) : null}
              {v.status === "published" ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => void handleArchive(v.id)}
                >
                  Archive
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void handleDuplicate(v.id)}
              >
                Duplicate
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={exportingVersionId === v.id}
                onClick={() => void handleExport(v)}
              >
                {exportingVersionId === v.id ? "Exporting…" : "Export JSON"}
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
