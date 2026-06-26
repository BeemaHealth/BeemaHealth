import { inputCls } from "@/components/quiz/quiz-primitives";
import { BELUGA_FIELD_OPTIONS } from "@/components/questionnaire/builder/field-catalog";
import {
  ADDRESS_BACKEND_FIELD_OPTIONS,
  addressBackendLabelForValue,
  type AddressSubFieldMapping,
} from "@/lib/questionnaire/address-mappings";

type AddressFieldMappingsEditorProps = {
  mappings: AddressSubFieldMapping[];
  disabled?: boolean;
  onChange: (next: AddressSubFieldMapping[]) => void;
  compact?: boolean;
  /** When true, Aretide intake targets are fixed for the selected section. */
  backendReadOnly?: boolean;
};

export function AddressFieldMappingsEditor({
  mappings,
  disabled = false,
  onChange,
  compact = false,
  backendReadOnly = false,
}: AddressFieldMappingsEditorProps) {
  function updateRow(
    key: AddressSubFieldMapping["key"],
    patch: Partial<Pick<AddressSubFieldMapping, "backend" | "beluga">>,
  ) {
    onChange(
      mappings.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
        Address field mappings
      </p>
      <p className="text-[10px] text-muted-foreground">
        {backendReadOnly
          ? "Nominatim fills each part when a patient picks a suggestion. Aretide intake targets are fixed for the section you chose; adjust Beluga mappings as needed."
          : "Map each address part to an Aretide intake target and a Beluga Health API field."}
      </p>
      <div
        className={`rounded-xl border border-border overflow-hidden ${
          compact ? "text-[10px]" : "text-xs"
        }`}
      >
        <div className="grid grid-cols-[1.1fr_1fr_1fr] gap-2 bg-muted/40 px-2.5 py-1.5 font-medium text-muted-foreground">
          <span>Nominatim part</span>
          <span>Aretide backend</span>
          <span>Beluga API</span>
        </div>
        {mappings.map((row) => (
          <div
            key={row.key}
            className="grid grid-cols-[1.1fr_1fr_1fr] gap-2 items-center px-2.5 py-2 border-t border-border"
          >
            <span className="text-foreground font-medium">{row.label}</span>
            {backendReadOnly ? (
              <span className="text-muted-foreground">
                {row.backend
                  ? addressBackendLabelForValue(row.backend)
                  : "— none —"}
              </span>
            ) : (
              <select
                className={`${inputCls} ${compact ? "text-[10px] py-1" : "text-xs"}`}
                value={row.backend}
                disabled={disabled}
                onChange={(e) =>
                  updateRow(row.key, { backend: e.target.value })
                }
              >
                {ADDRESS_BACKEND_FIELD_OPTIONS.map((opt) => (
                  <option key={opt.value || "none"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
            <select
              className={`${inputCls} ${compact ? "text-[10px] py-1" : "text-xs"}`}
              value={row.beluga}
              disabled={
                disabled || row.key === "verified" || row.key === "country"
              }
              onChange={(e) => updateRow(row.key, { beluga: e.target.value })}
            >
              {BELUGA_FIELD_OPTIONS.map((opt) => (
                <option key={opt.value || "none"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">
        County and country are stored for Aretide intake and pharmacy routing.
        Beluga visit payloads only include street, city, state, and ZIP.
      </p>
    </div>
  );
}
