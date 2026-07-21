import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AccountSectionCard } from "@/components/portal/AccountSectionCard";
import { Button } from "@/components/ui/button";
import { Field, inputCls } from "@/components/quiz/quiz-primitives";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  archiveStaffVendorVersion,
  createStaffVendor,
  createStaffVendorVersion,
  deleteStaffVendor,
  deleteStaffVendorVersion,
  fetchStaffVendors,
  patchStaffVendor,
  patchStaffVendorVersion,
  publishStaffVendorVersion,
  unarchiveStaffVendorVersion,
  type ApiVendorSchema,
  type ApiVendorVersionField,
  type ApiVendorVersionSchema,
} from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  GripVertical,
  Info,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";

export const Route = createFileRoute("/staff/vendors")({
  component: StaffVendorsPage,
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function exportJson(
  schema: { fields: ApiVendorVersionField[] },
  filename: string,
) {
  const blob = new Blob([JSON.stringify(schema, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseImportedJson(
  raw: string,
): { fields: ApiVendorVersionField[] } | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const fields = parsed as ApiVendorVersionField[];
      return { fields };
    }
    if (
      parsed &&
      typeof parsed === "object" &&
      "fields" in parsed &&
      Array.isArray((parsed as { fields: unknown }).fields)
    ) {
      return { fields: (parsed as { fields: ApiVendorVersionField[] }).fields };
    }
    return null;
  } catch {
    return null;
  }
}

// ── Field editor ─────────────────────────────────────────────────────────────

function FieldRow({
  field,
  onChange,
  onRemove,
}: {
  field: ApiVendorVersionField;
  onChange: (f: ApiVendorVersionField) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b last:border-0">
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <input
        className="flex-1 rounded border bg-background px-2 py-1 text-xs font-mono"
        placeholder="field_id"
        value={field.id}
        onChange={(e) => onChange({ ...field, id: e.target.value.trim() })}
      />
      <input
        className="flex-[2] rounded border bg-background px-2 py-1 text-xs"
        placeholder="Label"
        value={field.label}
        onChange={(e) => onChange({ ...field, label: e.target.value })}
      />
      <label className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
        <input
          type="checkbox"
          checked={field.required}
          onChange={(e) => onChange({ ...field, required: e.target.checked })}
        />
        Required
      </label>
      <button
        type="button"
        onClick={onRemove}
        className="text-destructive hover:text-destructive/80"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function FieldsEditor({
  fields,
  onChange,
}: {
  fields: ApiVendorVersionField[];
  onChange: (fields: ApiVendorVersionField[]) => void;
}) {
  function addField() {
    onChange([...fields, { id: "", label: "", required: false }]);
  }

  function updateField(i: number, f: ApiVendorVersionField) {
    const next = [...fields];
    next[i] = f;
    onChange(next);
  }

  function removeField(i: number) {
    onChange(fields.filter((_, idx) => idx !== i));
  }

  return (
    <div className="rounded border">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
        <span className="w-4" />
        <span className="flex-1">Field ID</span>
        <span className="flex-[2]">Label</span>
        <span className="w-20">Required</span>
        <span className="w-5" />
      </div>
      <div className="px-3 divide-y">
        {fields.map((f, i) => (
          <FieldRow
            key={i}
            field={f}
            onChange={(updated) => updateField(i, updated)}
            onRemove={() => removeField(i)}
          />
        ))}
      </div>
      {fields.length === 0 && (
        <p className="px-3 py-3 text-xs text-muted-foreground">
          No fields yet.
        </p>
      )}
      <div className="px-3 py-2 border-t">
        <button
          type="button"
          onClick={addField}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Plus className="h-3.5 w-3.5" />
          Add field
        </button>
      </div>
    </div>
  );
}

// ── JSON import panel ─────────────────────────────────────────────────────────

function JsonImportPanel({
  onImport,
}: {
  onImport: (fields: ApiVendorVersionField[]) => void;
}) {
  const [raw, setRaw] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handlePaste(text: string) {
    setRaw(text);
    setParseError(null);
    if (!text.trim()) return;
    const result = parseImportedJson(text);
    if (!result) {
      setParseError('Invalid JSON. Expected {"fields":[...]} or a bare array.');
    } else {
      onImport(result.fields);
    }
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRaw(text);
      handleParse(text);
    };
    reader.readAsText(file);
  }

  function handleParse(text: string) {
    setParseError(null);
    const result = parseImportedJson(text);
    if (!result) {
      setParseError('Invalid JSON. Expected {"fields":[...]} or a bare array.');
    } else {
      onImport(result.fields);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-xs font-medium">Paste or upload JSON schema</p>
        <button
          type="button"
          className="ml-auto flex items-center gap-1 text-xs text-primary hover:underline"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-3 w-3" />
          Upload file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>
      <textarea
        className="w-full rounded border bg-background px-3 py-2 text-xs font-mono h-32 resize-y"
        placeholder={
          '{"fields":[{"id":"firstName","label":"First name","required":true},...]}'
        }
        value={raw}
        onChange={(e) => handlePaste(e.target.value)}
      />
      {parseError && <p className="text-destructive text-xs">{parseError}</p>}
    </div>
  );
}

// ── Version row ───────────────────────────────────────────────────────────────

function statusVariant(
  s: "draft" | "published" | "archived",
): "secondary" | "default" | "outline" {
  return s === "published"
    ? "default"
    : s === "draft"
      ? "secondary"
      : "outline";
}

function VendorVersionRow({
  vendorId,
  vendorSlug,
  version,
  onMutate,
}: {
  vendorId: string;
  vendorSlug: string;
  version: ApiVendorVersionSchema;
  onMutate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<ApiVendorVersionField[]>(
    version.schema.fields,
  );
  const [label, setLabel] = useState(version.label);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [editMode, setEditMode] = useState<"fields" | "json">("fields");

  useEffect(() => {
    setFields(version.schema.fields);
    setLabel(version.label);
  }, [version]);

  async function save() {
    const bad = fields.find((f) => !f.id.trim());
    if (bad !== undefined) {
      setError("All fields need an ID.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await patchStaffVendorVersion(vendorId, version.id, {
        label,
        schema: { fields },
      });
      onMutate();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    await publishStaffVendorVersion(vendorId, version.id);
    onMutate();
  }

  async function archive() {
    if (!confirm("Archive this version?")) return;
    await archiveStaffVendorVersion(vendorId, version.id);
    onMutate();
  }

  async function unarchive() {
    await unarchiveStaffVendorVersion(vendorId, version.id);
    onMutate();
  }

  async function remove() {
    if (!confirm(`Delete version ${version.display_label}?`)) return;
    await deleteStaffVendorVersion(vendorId, version.id);
    onMutate();
  }

  async function duplicate() {
    setDuplicating(true);
    try {
      await createStaffVendorVersion(vendorId, {
        label: version.label ? `${version.label} (copy)` : undefined,
        schema: { fields: version.schema.fields },
      });
      onMutate();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Duplicate failed");
    } finally {
      setDuplicating(false);
    }
  }

  function handleExport() {
    exportJson(
      version.schema,
      `${vendorSlug}_${version.display_label.replace(/\s+/g, "_")}.json`,
    );
  }

  const isDraft = version.status === "draft";
  const isArchived = version.status === "archived";

  return (
    <div className="rounded border bg-background">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-muted-foreground"
        >
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        <span className="font-medium text-sm">{version.display_label}</span>
        <Badge variant={statusVariant(version.status)} className="text-xs">
          {version.status}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {version.schema.fields.length} field
          {version.schema.fields.length !== 1 ? "s" : ""}
        </span>
        <div className="ml-auto flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            title="Export JSON"
            onClick={handleExport}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            title="Duplicate version"
            disabled={duplicating}
            onClick={() => void duplicate()}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          {isDraft && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setOpen((v) => !v)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void publish()}
              >
                Publish
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => void remove()}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          {version.status === "published" && (
            <Button size="sm" variant="outline" onClick={() => void archive()}>
              Archive
            </Button>
          )}
          {isArchived && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void unarchive()}
            >
              Restore
            </Button>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t px-3 pb-3 pt-3 space-y-3">
          <Field label="Version label">
            <input
              className={inputCls}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. v2"
              disabled={!isDraft}
            />
          </Field>

          <div className="space-y-2">
            {isDraft && (
              <div className="flex items-center gap-1 text-xs">
                <span className="font-medium mr-1">Fields</span>
                <button
                  type="button"
                  className={`px-2 py-0.5 rounded border ${editMode === "fields" ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
                  onClick={() => setEditMode("fields")}
                >
                  Editor
                </button>
                <button
                  type="button"
                  className={`px-2 py-0.5 rounded border ${editMode === "json" ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
                  onClick={() => setEditMode("json")}
                >
                  Import JSON
                </button>
              </div>
            )}
            {!isDraft && <p className="text-xs font-medium">Fields</p>}
            {editMode === "fields" || !isDraft ? (
              <FieldsEditor
                fields={fields}
                onChange={isDraft ? setFields : () => {}}
              />
            ) : (
              <>
                <JsonImportPanel
                  onImport={(imported) => {
                    setFields(imported);
                    setError(null);
                  }}
                />
                {fields.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {fields.length} field{fields.length !== 1 ? "s" : ""} ready.
                    Switch to Editor to review, then save.
                  </p>
                )}
              </>
            )}
          </div>

          {isDraft && (
            <>
              {error && <p className="text-destructive text-xs">{error}</p>}
              <Button size="sm" onClick={() => void save()} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </>
          )}
          {!isDraft && (
            <p className="text-xs text-muted-foreground">
              {isArchived
                ? "Archived. Restore to edit."
                : "Published versions are read-only. Create a new draft version to make changes."}
            </p>
          )}
        </div>
      )}
      {error && !open && (
        <p className="px-3 pb-2 text-destructive text-xs">{error}</p>
      )}
    </div>
  );
}

// ── Vendor card ───────────────────────────────────────────────────────────────

function VendorCard({
  vendor,
  onMutate,
}: {
  vendor: ApiVendorSchema;
  onMutate: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(vendor.name);
  const [desc, setDesc] = useState(vendor.description);
  const [active, setActive] = useState(vendor.active);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [duplicatingVendor, setDuplicatingVendor] = useState(false);

  // Add version form
  const [addingVersion, setAddingVersion] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newFields, setNewFields] = useState<ApiVendorVersionField[]>([]);
  const [importMode, setImportMode] = useState<"fields" | "json">("fields");
  const [addError, setAddError] = useState<string | null>(null);

  async function saveVendor() {
    setSaving(true);
    setError(null);
    try {
      await patchStaffVendor(vendor.id, { name, description: desc, active });
      setEditing(false);
      onMutate();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete vendor "${vendor.name}"?`)) return;
    await deleteStaffVendor(vendor.id);
    onMutate();
  }

  async function duplicateVendor() {
    if (
      !confirm(
        `Duplicate "${vendor.name}"? All non-archived versions will be copied as drafts.`,
      )
    )
      return;
    setDuplicatingVendor(true);
    setError(null);
    try {
      const newVendor = await createStaffVendor({
        slug: `${vendor.slug}-copy`,
        name: `${vendor.name} (copy)`,
        description: vendor.description,
        active: vendor.active,
      });
      const versionsToCopy = vendor.versions.filter(
        (v) => v.status !== "archived",
      );
      await Promise.all(
        versionsToCopy.map((v) =>
          createStaffVendorVersion(newVendor.id, {
            label: v.label,
            schema: { fields: v.schema.fields },
          }),
        ),
      );
      onMutate();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Duplicate failed");
    } finally {
      setDuplicatingVendor(false);
    }
  }

  async function createVersion() {
    const bad = newFields.find((f) => !f.id.trim());
    if (bad !== undefined) {
      setAddError("All fields need an ID.");
      return;
    }
    setSaving(true);
    setAddError(null);
    try {
      await createStaffVendorVersion(vendor.id, {
        label: newLabel,
        schema: { fields: newFields },
      });
      setAddingVersion(false);
      setNewLabel("");
      setNewFields([]);
      setImportMode("fields");
      onMutate();
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  const publishedCount = vendor.versions.filter(
    (v) => v.status === "published",
  ).length;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Vendor header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-muted-foreground"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              className={`${inputCls} text-sm font-semibold`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          ) : (
            <span className="font-semibold">{vendor.name}</span>
          )}
          <span className="ml-2 text-xs text-muted-foreground font-mono">
            {vendor.slug}
          </span>
          {!vendor.active && (
            <Badge variant="outline" className="ml-2 text-xs">
              inactive
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {publishedCount} published · {vendor.versions.length} total
        </span>
        <Button
          size="sm"
          variant="ghost"
          title="Duplicate vendor"
          disabled={duplicatingVendor}
          onClick={() => void duplicateVendor()}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setEditing((v) => !v);
          }}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive"
          onClick={() => void remove()}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {editing && (
        <div className="px-4 py-3 border-b space-y-2 bg-muted/10">
          <Field label="Description">
            <input
              className={inputCls}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Active
          </label>
          {error && <p className="text-destructive text-xs">{error}</p>}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => void saveVendor()}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {!editing && error && (
        <p className="px-4 py-2 text-destructive text-xs border-b">{error}</p>
      )}

      {expanded && (
        <div className="px-4 py-3 space-y-2">
          {vendor.versions.map((v) => (
            <VendorVersionRow
              key={v.id}
              vendorId={vendor.id}
              vendorSlug={vendor.slug}
              version={v}
              onMutate={onMutate}
            />
          ))}

          {addingVersion ? (
            <div className="rounded border p-3 space-y-3 bg-muted/20">
              <p className="text-sm font-medium">New draft version</p>
              <Field label="Version label (optional)">
                <input
                  className={inputCls}
                  value={newLabel}
                  placeholder="e.g. v2"
                  onChange={(e) => setNewLabel(e.target.value)}
                />
              </Field>

              {/* Mode toggle */}
              <div className="flex gap-1 text-xs">
                <button
                  type="button"
                  className={`px-2 py-1 rounded border ${importMode === "fields" ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
                  onClick={() => setImportMode("fields")}
                >
                  Fields editor
                </button>
                <button
                  type="button"
                  className={`px-2 py-1 rounded border ${importMode === "json" ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
                  onClick={() => setImportMode("json")}
                >
                  Import JSON
                </button>
              </div>

              {importMode === "fields" ? (
                <div>
                  <p className="text-xs font-medium mb-1.5">Fields</p>
                  <FieldsEditor fields={newFields} onChange={setNewFields} />
                </div>
              ) : (
                <>
                  <JsonImportPanel
                    onImport={(fields) => {
                      setNewFields(fields);
                      setAddError(null);
                    }}
                  />
                  {newFields.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {newFields.length} field
                      {newFields.length !== 1 ? "s" : ""} imported. Switch to
                      Fields editor to review or edit.
                    </p>
                  )}
                </>
              )}

              {addError && (
                <p className="text-destructive text-xs">{addError}</p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => void createVersion()}
                  disabled={saving}
                >
                  {saving ? "Creating…" : "Create draft"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAddingVersion(false);
                    setNewFields([]);
                    setNewLabel("");
                    setImportMode("fields");
                    setAddError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddingVersion(true)}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add version
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Switching vendors dialog ──────────────────────────────────────────────────

function SwitchingVendorsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Switching vendors</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm text-foreground">
          <p>
            Field mappings are stored per questionnaire version and reference
            each vendor&apos;s API field IDs directly (e.g.{" "}
            <span className="font-mono text-xs">beluga:firstName</span>). They
            are not automatically remapped when you switch vendors.
          </p>

          <div className="rounded-lg bg-muted/50 border px-4 py-3 space-y-2">
            <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
              How to switch vendors on a questionnaire
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-sm">
              <li>
                Open the questionnaire in the flow editor and{" "}
                <strong>duplicate the current published version</strong> to
                create a new draft.
              </li>
              <li>
                In the draft&apos;s toolbar,{" "}
                <strong>select the new vendor</strong> from the API vendor
                picker.
              </li>
              <li>
                Open each step and <strong>remap every field</strong> to the
                equivalent field in the new vendor&apos;s schema, including
                account, address, choice options, and direct mappings.
              </li>
              <li>
                Review the intake flow end-to-end, then{" "}
                <strong>publish the new version</strong>.
              </li>
            </ol>
          </div>

          <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 space-y-1 text-yellow-900">
            <p className="font-semibold text-xs">API endpoint note</p>
            <p className="text-xs">
              The intake submission endpoint is also vendor-specific. Beluga
              Health is the current primary vendor; its endpoint is wired to the
              Beluga visit creation API. If you switch to a different vendor,
              the backend{" "}
              <span className="font-mono">build_beluga_visit_payload</span>{" "}
              logic and intake submission view will also need updating to target
              the new vendor&apos;s API.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Existing questionnaire versions and their field mappings are never
            modified automatically; all changes are opt-in via duplication.
          </p>
        </div>
        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function StaffVendorsPage() {
  const [vendors, setVendors] = useState<ApiVendorSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [switchingInfoOpen, setSwitchingInfoOpen] = useState(false);

  async function load() {
    try {
      setVendors(await fetchStaffVendors());
    } catch (e: unknown) {
      setPageError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    if (!slug || !name) {
      setFormError("Slug and name are required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await createStaffVendor({ slug, name, description: desc, active: true });
      setAdding(false);
      setSlug("");
      setName("");
      setDesc("");
      void load();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <SwitchingVendorsDialog
        open={switchingInfoOpen}
        onClose={() => setSwitchingInfoOpen(false)}
      />

      <AccountSectionCard
        tone="contact"
        title="API Vendors"
        description="Manage external API vendors and their versioned field schemas. The questionnaire builder uses the published version to map fields to vendor payload properties."
      >
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          onClick={() => setSwitchingInfoOpen(true)}
        >
          <Info className="h-3.5 w-3.5" />
          Switching vendors?
        </button>
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {pageError && <p className="text-destructive text-sm">{pageError}</p>}
        {!loading && !pageError && (
          <div className="space-y-4">
            {vendors.length === 0 && (
              <p className="text-sm text-muted-foreground">No vendors yet.</p>
            )}
            {vendors.map((v) => (
              <VendorCard key={v.id} vendor={v} onMutate={() => void load()} />
            ))}
          </div>
        )}
      </AccountSectionCard>

      <AccountSectionCard tone="contact" title="Add Vendor">
        {adding ? (
          <div className="space-y-3 max-w-md">
            <Field label="Name">
              <input
                className={inputCls}
                value={name}
                placeholder="Beluga Health"
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slug) setSlug(slugify(e.target.value));
                }}
              />
            </Field>
            <Field label="Slug">
              <input
                className={inputCls}
                value={slug}
                placeholder="beluga"
                onChange={(e) => setSlug(slugify(e.target.value))}
              />
            </Field>
            <Field label="Description (optional)">
              <input
                className={inputCls}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </Field>
            {formError && (
              <p className="text-destructive text-xs">{formError}</p>
            )}
            <div className="flex gap-2">
              <Button onClick={() => void create()} disabled={saving}>
                {saving ? "Creating…" : "Create vendor"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setAdding(false);
                  setFormError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setAdding(true)}>
            <Plus className="mr-1 h-4 w-4" /> New vendor
          </Button>
        )}
      </AccountSectionCard>
    </div>
  );
}
