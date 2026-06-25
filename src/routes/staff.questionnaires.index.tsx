import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AccountSectionCard } from "@/components/portal/AccountSectionCard";
import { Button } from "@/components/ui/button";
import { Field, inputCls } from "@/components/quiz/quiz-primitives";
import {
  createStaffQuestionnaire,
  fetchStaffMedications,
  fetchStaffQuestionnaires,
  type MedicationItem,
  type QuestionnaireListItem,
} from "@/lib/api/client";
import { ListChecks } from "lucide-react";

export const Route = createFileRoute("/staff/questionnaires/")({
  component: StaffQuestionnairesPage,
});

function StaffQuestionnairesPage() {
  const [items, setItems] = useState<QuestionnaireListItem[]>([]);
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newType, setNewType] = useState<"qualify" | "intake">("qualify");
  const [newTitle, setNewTitle] = useState("");
  const [newMedId, setNewMedId] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function reload() {
    const [q, m] = await Promise.all([
      fetchStaffQuestionnaires(),
      fetchStaffMedications(),
    ]);
    setItems(q);
    setMedications(m);
  }

  useEffect(() => {
    void reload().catch(() => {});
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      await createStaffQuestionnaire({
        slug: newSlug.trim(),
        questionnaire_type: newType,
        title: newTitle.trim(),
        medication_id: newMedId || null,
      });
      setShowNew(false);
      setNewSlug("");
      setNewTitle("");
      setNewMedId("");
      await reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create questionnaire.",
      );
    } finally {
      setCreating(false);
    }
  }

  const grouped = {
    qualify: items.filter((i) => i.questionnaire_type === "qualify"),
    intake: items.filter((i) => i.questionnaire_type === "intake"),
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Questionnaires</h1>
          <p className="text-sm text-muted-foreground">
            Manage qualify and intake schemas. Create medication-specific
            questionnaires to show different questions per drug.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowNew(true)} disabled={showNew}>
          New questionnaire
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {showNew && (
        <AccountSectionCard
          tone="contact"
          title="New questionnaire"
          icon={ListChecks}
        >
          <form onSubmit={(e) => void handleCreate(e)} className="space-y-3">
            <Field label="Slug (URL identifier)" required>
              <input
                className={inputCls}
                value={newSlug}
                maxLength={64}
                pattern="[a-z0-9][a-z0-9\-_]*"
                title="Lowercase letters, numbers, hyphens, underscores"
                placeholder="e.g. qualify_semaglutide"
                required
                onChange={(e) => setNewSlug(e.target.value.toLowerCase())}
              />
            </Field>
            <Field label="Type" required>
              <select
                className={inputCls}
                value={newType}
                onChange={(e) =>
                  setNewType(e.target.value as "qualify" | "intake")
                }
              >
                <option value="qualify">Qualify</option>
                <option value="intake">Intake</option>
              </select>
            </Field>
            <Field label="Title" required>
              <input
                className={inputCls}
                value={newTitle}
                maxLength={128}
                placeholder="e.g. Semaglutide qualify funnel"
                required
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </Field>
            <Field label="Medication (optional — leave blank for default)">
              <select
                className={inputCls}
                value={newMedId}
                onChange={(e) => setNewMedId(e.target.value)}
              >
                <option value="">Default (all medications)</option>
                {medications.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={creating}>
                {creating ? "Creating…" : "Create"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowNew(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </AccountSectionCard>
      )}

      {(["qualify", "intake"] as const).map((qtype) => (
        <div key={qtype} className="space-y-3">
          <h2 className="text-base font-semibold capitalize text-foreground">
            {qtype} questionnaires
          </h2>
          {grouped[qtype].length === 0 ? (
            <p className="text-sm text-muted-foreground">None yet.</p>
          ) : (
            grouped[qtype].map((item) => (
              <AccountSectionCard
                key={item.id}
                tone="orders"
                title={item.title}
                icon={ListChecks}
                description={
                  `Slug: ${item.slug}` +
                  (item.medication
                    ? ` · ${item.medication.name}`
                    : " · Default") +
                  (item.published_version
                    ? ` · v${item.published_version.version_label} published`
                    : " · No published version")
                }
              >
                <Button asChild size="sm">
                  <Link
                    to="/staff/questionnaires/$slug"
                    params={{ slug: item.slug }}
                  >
                    Manage versions
                  </Link>
                </Button>
              </AccountSectionCard>
            ))
          )}
        </div>
      ))}
    </div>
  );
}
