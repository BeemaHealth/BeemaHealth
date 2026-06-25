import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AccountSectionCard } from "@/components/portal/AccountSectionCard";
import { Button } from "@/components/ui/button";
import { Field, inputCls } from "@/components/quiz/quiz-primitives";
import {
  createStaffMedication,
  deleteStaffMedication,
  fetchStaffMedications,
  updateStaffMedication,
  type MedicationItem,
} from "@/lib/api/client";
import { Pill } from "lucide-react";

export const Route = createFileRoute("/staff/medications")({
  component: StaffMedicationsPage,
});

const DRUG_TYPES = [
  { value: "semaglutide", label: "Semaglutide" },
  { value: "tirzepatide", label: "Tirzepatide" },
  { value: "other", label: "Other" },
] as const;

const DELIVERY_TYPES = [
  { value: "injection", label: "Injection" },
  { value: "daily_pill", label: "Daily pill" },
] as const;

type FormState = {
  name: string;
  slug: string;
  drug_type: string;
  delivery_type: string;
  price_cents: string;
  active: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  slug: "",
  drug_type: "semaglutide",
  delivery_type: "injection",
  price_cents: "0",
  active: true,
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function MedicationForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: FormState;
  onSave: (data: FormState) => void;
  onCancel?: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial);

  function set(field: keyof FormState, value: string | boolean) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "name" && typeof value === "string") {
        next.slug = slugify(value);
      }
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Field label="Name" required>
        <input
          className={inputCls}
          value={form.name}
          maxLength={128}
          required
          onChange={(e) => set("name", e.target.value)}
        />
      </Field>
      <Field label="Slug (URL identifier)" required>
        <input
          className={inputCls}
          value={form.slug}
          maxLength={64}
          pattern="[a-z0-9][a-z0-9\-]*"
          title="Lowercase letters, numbers, and hyphens only"
          required
          onChange={(e) => set("slug", e.target.value)}
        />
      </Field>
      <Field label="Drug type" required>
        <select
          className={inputCls}
          value={form.drug_type}
          onChange={(e) => set("drug_type", e.target.value)}
        >
          {DRUG_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Delivery type" required>
        <select
          className={inputCls}
          value={form.delivery_type}
          onChange={(e) => set("delivery_type", e.target.value)}
        >
          {DELIVERY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Price (USD)" required>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">$</span>
          <input
            className={inputCls}
            type="number"
            min="0"
            step="0.01"
            value={(Number(form.price_cents) / 100).toFixed(2)}
            onChange={(e) => {
              const dollars = parseFloat(e.target.value) || 0;
              set("price_cents", String(Math.round(dollars * 100)));
            }}
          />
        </div>
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => set("active", e.target.checked)}
        />
        Active (visible to patients)
      </label>
      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function StaffMedicationsPage() {
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function reload() {
    const data = await fetchStaffMedications();
    setMedications(data);
  }

  useEffect(() => {
    void reload().catch(() => setMedications([]));
  }, []);

  async function handleCreate(form: FormState) {
    setError("");
    setSaving(true);
    try {
      await createStaffMedication({
        name: form.name,
        slug: form.slug,
        drug_type: form.drug_type,
        delivery_type: form.delivery_type,
        price_cents: Number(form.price_cents),
        active: form.active,
      });
      setShowNew(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string, form: FormState) {
    setError("");
    setSaving(true);
    try {
      await updateStaffMedication(id, {
        name: form.name,
        slug: form.slug,
        drug_type: form.drug_type,
        delivery_type: form.delivery_type,
        price_cents: Number(form.price_cents),
        active: form.active,
      });
      setEditingId(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setError("");
    try {
      await deleteStaffMedication(id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Medications</h1>
          <p className="text-sm text-muted-foreground">
            Manage the medications your platform offers. Each medication can have its own qualify and intake questionnaire.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowNew(true)} disabled={showNew}>
          Add medication
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {showNew && (
        <AccountSectionCard tone="contact" title="New medication" icon={Pill}>
          <MedicationForm
            initial={EMPTY_FORM}
            onSave={handleCreate}
            onCancel={() => setShowNew(false)}
            saving={saving}
          />
        </AccountSectionCard>
      )}

      {medications.length === 0 && !showNew && (
        <p className="text-sm text-muted-foreground">
          No medications yet. Add your first one above.
        </p>
      )}

      <div className="space-y-4">
        {medications.map((med) => (
          <AccountSectionCard
            key={med.id}
            tone={med.active ? "consent" : "contact"}
            title={med.name}
            icon={Pill}
            description={`${med.slug} · ${med.drug_type} · ${med.delivery_type.replace("_", " ")} · $${(med.price_cents / 100).toFixed(2)}${med.active ? "" : " · Inactive"}`}
          >
            {editingId === med.id ? (
              <MedicationForm
                initial={{
                  name: med.name,
                  slug: med.slug,
                  drug_type: med.drug_type,
                  delivery_type: med.delivery_type,
                  price_cents: String(med.price_cents),
                  active: med.active,
                }}
                onSave={(form) => void handleUpdate(med.id, form)}
                onCancel={() => setEditingId(null)}
                saving={saving}
              />
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingId(med.id)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => void handleDelete(med.id, med.name)}
                >
                  Delete
                </Button>
              </div>
            )}
          </AccountSectionCard>
        ))}
      </div>
    </div>
  );
}
