import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, inputCls } from "@/components/quiz/quiz-primitives";
import { CTA_IDS } from "@/lib/cta-ids";
import {
  fetchStaffQualifyCtaOwnership,
  type QualifyCtaOwnership,
  updateStaffQuestionnaireVersion,
} from "@/lib/api/client";

type EntryPointsPanelProps = {
  slug: string;
  versionId: string;
  ctaIds: string[];
  isDefaultEntry: boolean;
  isDraft: boolean;
  onReload: () => Promise<void>;
  onClose: () => void;
};

const KNOWN_CTA_IDS = Object.values(CTA_IDS);

export function EntryPointsPanel({
  slug,
  versionId,
  ctaIds,
  isDefaultEntry,
  isDraft,
  onReload,
  onClose,
}: EntryPointsPanelProps) {
  const [localCtas, setLocalCtas] = useState<string[]>(ctaIds);
  const [localDefault, setLocalDefault] = useState(isDefaultEntry);
  const [newCta, setNewCta] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ownership, setOwnership] = useState<QualifyCtaOwnership[]>([]);

  useEffect(() => {
    setLocalCtas(ctaIds);
    setLocalDefault(isDefaultEntry);
  }, [ctaIds, isDefaultEntry]);

  useEffect(() => {
    if (!isDraft) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchStaffQualifyCtaOwnership();
        if (!cancelled) setOwnership(data.ownership);
      } catch {
        // Non-blocking — warnings are informational only.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isDraft, versionId]);

  const ownershipByCta = useMemo(() => {
    const map = new Map<string, QualifyCtaOwnership>();
    for (const row of ownership) {
      if (row.version_id !== versionId) {
        map.set(row.cta_id, row);
      }
    }
    return map;
  }, [ownership, versionId]);

  function addCta(value: string) {
    const v = value.trim();
    if (!v || localCtas.includes(v)) return;
    setLocalCtas([...localCtas, v]);
    setNewCta("");
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      await updateStaffQuestionnaireVersion(slug, versionId, {
        cta_ids: localCtas,
        is_default_entry: localDefault,
      });
      try {
        const refreshed = await fetchStaffQualifyCtaOwnership();
        setOwnership(refreshed.ownership);
      } catch {
        // Non-blocking.
      }
      await onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const unusedKnown = KNOWN_CTA_IDS.filter((c) => !localCtas.includes(c));

  return (
    <aside className="w-80 shrink-0 border-l border-border bg-card overflow-y-auto flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div>
          <p className="text-sm font-semibold text-foreground">Entry points</p>
          <p className="text-[11px] text-muted-foreground">
            Which CTAs enter this qualify version
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {error && (
          <p className="text-xs text-destructive rounded-lg bg-destructive/10 px-3 py-2">
            {error}
          </p>
        )}

        <label className="flex items-start gap-2 text-xs text-foreground">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={localDefault}
            disabled={!isDraft}
            onChange={(e) => setLocalDefault(e.target.checked)}
          />
          <span>
            <strong>Default entry</strong>: used for any CTA or landing page
            with no explicit mapping. Only one published qualify can be default.
          </span>
        </label>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Mapped CTA ids
          </p>
          {localCtas.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No CTAs mapped. This version is reached only if it is the default
              entry or pinned by version id.
            </p>
          )}
          {localCtas.map((cta) => {
            const conflict = ownershipByCta.get(cta);
            return (
              <div
                key={cta}
                className="rounded-lg border border-border px-2.5 py-1.5 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-foreground truncate">
                    {cta}
                  </span>
                  {isDraft && (
                    <button
                      type="button"
                      className="rounded p-1 text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() =>
                        setLocalCtas(localCtas.filter((c) => c !== cta))
                      }
                    >
                      <Trash2 className="size-3" />
                    </button>
                  )}
                </div>
                {conflict && isDraft && (
                  <p className="flex items-start gap-1.5 text-[10px] text-warning">
                    <AlertTriangle className="size-3 shrink-0 mt-0.5" />
                    <span>
                      Currently published on{" "}
                      <strong>{conflict.questionnaire_slug}</strong> (
                      {conflict.version_label}). It stays there until you{" "}
                      <strong>publish</strong> this draft; then it moves here
                      {conflict.will_archive_on_claim
                        ? " and that qualify flow is unpublished (its last CTA)"
                        : ""}
                      .
                    </span>
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {isDraft && (
          <div className="space-y-2">
            <Field label="Add a CTA id">
              <div className="flex gap-1.5">
                <input
                  className={`${inputCls} text-xs flex-1`}
                  placeholder="e.g. home_hero"
                  value={newCta}
                  maxLength={64}
                  onChange={(e) =>
                    setNewCta(e.target.value.trim().replace(/\s+/g, "_"))
                  }
                  onKeyDown={(e) => e.key === "Enter" && addCta(newCta)}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => addCta(newCta)}
                >
                  <Plus className="size-3" />
                </Button>
              </div>
            </Field>
            {unusedKnown.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground">
                  Known CTAs in the app:
                </p>
                <div className="flex flex-wrap gap-1">
                  {unusedKnown.map((c) => {
                    const conflict = ownershipByCta.get(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-mono hover:bg-muted ${
                          conflict
                            ? "border-warning/50 text-warning"
                            : "border-border text-muted-foreground"
                        }`}
                        onClick={() => addCta(c)}
                        title={
                          conflict
                            ? `Currently published on ${conflict.questionnaire_slug}, moves here when you publish`
                            : undefined
                        }
                      >
                        + {c}
                        {conflict ? " ⚠" : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {isDraft && (
          <Button
            type="button"
            size="sm"
            disabled={saving}
            onClick={() => void save()}
            className="w-full"
          >
            {saving ? "Saving…" : "Save entry points"}
          </Button>
        )}
        {!isDraft && (
          <p className="text-[11px] text-muted-foreground">
            Entry points are editable on draft versions. Publishing this draft
            transfers its CTA ids from any other published qualify version.
          </p>
        )}
      </div>
    </aside>
  );
}
