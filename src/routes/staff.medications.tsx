import { useEffect, useRef, useState } from "react";
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

const BASE_DRUG_TYPES = [
  { value: "semaglutide", label: "Semaglutide" },
  { value: "tirzepatide", label: "Tirzepatide" },
];

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
  drugTypes,
  onAddDrugType,
}: {
  initial: FormState;
  onSave: (data: FormState) => void;
  onCancel?: () => void;
  saving: boolean;
  drugTypes: { value: string; label: string }[];
  onAddDrugType: (type: { value: string; label: string }) => void;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [showCustomDrugType, setShowCustomDrugType] = useState(false);
  const [customDrugTypeInput, setCustomDrugTypeInput] = useState("");
  const customInputRef = useRef<HTMLInputElement>(null);

  function set(field: keyof FormState, value: string | boolean) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "name" && typeof value === "string") {
        next.slug = slugify(value);
      }
      return next;
    });
  }

  function handleDrugTypeChange(value: string) {
    if (value === "__other__") {
      setShowCustomDrugType(true);
      setTimeout(() => customInputRef.current?.focus(), 0);
    } else {
      setShowCustomDrugType(false);
      set("drug_type", value);
    }
  }

  function handleCustomDrugTypeConfirm() {
    const raw = customDrugTypeInput.trim();
    if (!raw) return;
    const slug = raw
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    const newType = { value: slug, label: raw };
    onAddDrugType(newType);
    set("drug_type", slug);
    setShowCustomDrugType(false);
    setCustomDrugTypeInput("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
  }

  const isKnownDrugType = drugTypes.some((t) => t.value === form.drug_type);
  const selectValue = isKnownDrugType ? form.drug_type : "__other__";

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
          value={selectValue}
          onChange={(e) => handleDrugTypeChange(e.target.value)}
        >
          {drugTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
          <option value="__other__">Other…</option>
        </select>
        {showCustomDrugType && (
          <div className="mt-2 flex gap-2">
            <input
              ref={customInputRef}
              className={inputCls}
              placeholder="Enter drug type name"
              value={customDrugTypeInput}
              maxLength={64}
              onChange={(e) => setCustomDrugTypeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCustomDrugTypeConfirm();
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              onClick={handleCustomDrugTypeConfirm}
              disabled={!customDrugTypeInput.trim()}
            >
              Add
            </Button>
          </div>
        )}
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
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            defaultValue={(Number(form.price_cents) / 100).toFixed(2)}
            onBlur={(e) => {
              const raw = e.target.value.replace(/[^0-9.]/g, "");
              const dollars = parseFloat(raw) || 0;
              e.target.value = dollars.toFixed(2);
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
  const [drugTypes, setDrugTypes] = useState<{ value: string; label: string }[]>(BASE_DRUG_TYPES);
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function reload() {
    const data = await fetchStaffMedications();
    setMedications(data);
    // Seed any custom drug types found in existing medications
    setDrugTypes((prev) => {
      const existing = new Set(prev.map((t) => t.value));
      const extras: { value: string; label: string }[] = [];
      for (const med of data) {
        if (!existing.has(med.drug_type)) {
          existing.add(med.drug_type);
          extras.push({ value: med.drug_type, label: med.drug_type });
        }
      }
      return extras.length > 0 ? [...prev, ...extras] : prev;
    });
  }

  function handleAddDrugType(type: { value: string; label: string }) {
    setDrugTypes((prev) =>
      prev.some((t) => t.value === type.value) ? prev : [...prev, type],
    );
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
            drugTypes={drugTypes}
            onAddDrugType={handleAddDrugType}
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
                drugTypes={drugTypes}
                onAddDrugType={handleAddDrugType}
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
