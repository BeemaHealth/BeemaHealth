import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LIST_SPECS,
  validateListItem,
  type ListItemInput,
} from "../node-validation";
import {
  ContinueButton,
  ErrorNote,
  Field,
  FIELD_CLASS,
  NodeFrame,
} from "../ui";
import { DateParts } from "./FieldNodes";
import type { NodeRendererProps } from "../types";

type ListType = keyof typeof LIST_SPECS;

const NONE_LABEL: Record<ListType, string> = {
  allergies: "I have no known allergies",
  add_medication: "I do not take any medications",
  med_conditions: "I have no other medical conditions",
};

const ADD_LABEL: Record<ListType, string> = {
  allergies: "Add allergy",
  add_medication: "Add medication",
  med_conditions: "Add condition",
};

function seedItems(previous: unknown): {
  none: boolean;
  items: ListItemInput[];
} {
  const p = (previous && typeof previous === "object" ? previous : {}) as {
    none?: boolean;
    items?: ListItemInput[];
  };
  return {
    none: p.none === true,
    items: Array.isArray(p.items) ? p.items : [],
  };
}

function summary(type: ListType, item: ListItemInput): string {
  const extras = LIST_SPECS[type].fields
    .slice(1)
    .map((f) => item[f.key])
    .filter(Boolean);
  return [item.name, ...extras].join(" - ");
}

export function ListNode({
  type,
  ...props
}: NodeRendererProps & { type: ListType }) {
  const { node, previous, layout, busy, error, onSubmit } = props;
  const spec = LIST_SPECS[type];
  const start = seedItems(previous);
  const [none, setNone] = useState(start.none);
  const [items, setItems] = useState<ListItemInput[]>(start.items);
  const [draft, setDraft] = useState<ListItemInput>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [listError, setListError] = useState<string | null>(null);

  function addDraft(): ListItemInput[] | null {
    const result = validateListItem(type, draft);
    if (!result.ok) {
      setErrors(result.errors);
      return null;
    }
    if (items.length >= spec.max) {
      setListError("You added too many items.");
      return null;
    }
    const next = [...items, result.value];
    setItems(next);
    setDraft({});
    setErrors({});
    setListError(null);
    return next;
  }

  const draftTouched = Object.values(draft).some((v) => v.trim());

  async function submit() {
    if (none) {
      await onSubmit({ none: true, items: [] });
      return;
    }
    let finalItems = items;
    if (draftTouched) {
      const added = addDraft();
      if (!added) return;
      finalItems = added;
    }
    if (finalItems.length === 0) {
      setListError("Add at least one item, or choose the option for none.");
      return;
    }
    await onSubmit({ none: false, items: finalItems });
  }

  return (
    <NodeFrame title={node.title} body={node.body} icon={node.icon}>
      <form
        className="flex flex-col gap-6"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <button
          type="button"
          role="checkbox"
          aria-checked={none}
          disabled={busy}
          onClick={() => {
            setNone((n) => !n);
            setListError(null);
          }}
          className={cn(
            "flex items-center gap-3 rounded-2xl border p-4 text-left text-base font-semibold shadow-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            none
              ? "border-primary bg-primary-soft"
              : "border-border bg-card hover:border-foreground/30",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "h-5 w-5 shrink-0 rounded-md border-2",
              none
                ? "border-primary bg-primary"
                : "border-border bg-background",
            )}
          />
          {NONE_LABEL[type]}
        </button>

        {!none ? (
          <>
            {items.length > 0 ? (
              <ul className="flex flex-col gap-2" aria-label="Added items">
                {items.map((item, i) => (
                  <li
                    key={`${item.name}-${i}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft"
                  >
                    <span className="text-base text-foreground">
                      {summary(type, item)}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${item.name}`}
                      className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() =>
                        setItems((all) => all.filter((_, idx) => idx !== i))
                      }
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-border p-4 sm:p-5">
              {spec.fields.map((f) => {
                const id = `${node.id}-${f.key}`;
                return (
                  <Field
                    key={f.key}
                    label={f.label}
                    htmlFor={id}
                    error={errors[f.key]}
                  >
                    {f.kind === "severity" ? (
                      <select
                        id={id}
                        className={FIELD_CLASS}
                        value={draft[f.key] ?? ""}
                        disabled={busy}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, [f.key]: e.target.value }))
                        }
                      >
                        <option value="">Not sure</option>
                        <option value="mild">Mild</option>
                        <option value="moderate">Moderate</option>
                        <option value="severe">Severe</option>
                      </select>
                    ) : f.kind === "date" ? (
                      <DateParts
                        idPrefix={id}
                        value={draft[f.key] ?? ""}
                        disabled={busy}
                        invalid={Boolean(errors[f.key])}
                        onChange={(iso) =>
                          setDraft((d) => ({ ...d, [f.key]: iso }))
                        }
                      />
                    ) : f.kind === "text" ? (
                      <textarea
                        id={id}
                        className={cn(FIELD_CLASS, "h-auto min-h-24 py-3")}
                        maxLength={f.max}
                        value={draft[f.key] ?? ""}
                        disabled={busy}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, [f.key]: e.target.value }))
                        }
                      />
                    ) : (
                      <input
                        id={id}
                        className={FIELD_CLASS}
                        maxLength={f.max}
                        value={draft[f.key] ?? ""}
                        disabled={busy}
                        aria-invalid={errors[f.key] ? true : undefined}
                        onChange={(e) => {
                          setDraft((d) => ({ ...d, [f.key]: e.target.value }));
                          setErrors((er) => ({ ...er, [f.key]: "" }));
                        }}
                      />
                    )}
                  </Field>
                );
              })}
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => addDraft()}
                disabled={busy}
                className="self-start"
              >
                <Plus aria-hidden="true" />
                {ADD_LABEL[type]}
              </Button>
            </div>
          </>
        ) : null}

        <ErrorNote message={listError ?? error} />
        <ContinueButton
          label={layout.copy?.continue ?? "Continue"}
          busy={busy}
        />
      </form>
    </NodeFrame>
  );
}

export const AllergiesNode = (p: NodeRendererProps) => (
  <ListNode {...p} type="allergies" />
);
export const AddMedicationNode = (p: NodeRendererProps) => (
  <ListNode {...p} type="add_medication" />
);
export const MedConditionsNode = (p: NodeRendererProps) => (
  <ListNode {...p} type="med_conditions" />
);
