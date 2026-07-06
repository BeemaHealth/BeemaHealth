import { inputCls } from "@/components/quiz/quiz-primitives";
import {
  BELUGA_FIELD_OPTIONS,
  NO_VENDOR_FIELDS,
} from "@/components/questionnaire/builder/field-catalog";

type BelugaFieldOption = { value: string; label: string };
import {
  BACKEND_FIELD_OPTIONS,
  backendLabelForValue,
  type AccountSubFieldMapping,
} from "@/lib/questionnaire/account-mappings";

type AccountFieldMappingsEditorProps = {
  mappings: AccountSubFieldMapping[];
  disabled?: boolean;
  onChange: (next: AccountSubFieldMapping[]) => void;
  compact?: boolean;
  backendReadOnly?: boolean;
  belugaFields?: ReadonlyArray<BelugaFieldOption>;
  vendorLabel?: string;
};

export function AccountFieldMappingsEditor({
  mappings,
  disabled = false,
  onChange,
  compact = false,
  backendReadOnly = false,
  belugaFields = NO_VENDOR_FIELDS,
  vendorLabel = "API Mapping",
}: AccountFieldMappingsEditorProps) {
  function updateRow(
    key: AccountSubFieldMapping["key"],
    patch: Partial<Pick<AccountSubFieldMapping, "backend" | "beluga">>,
  ) {
    onChange(
      mappings.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
        Field mappings
      </p>
      <p className="text-[10px] text-muted-foreground">
        {backendReadOnly
          ? `Registration fields map to the Django register API automatically. ${vendorLabel} mappings can be adjusted per input.`
          : `Map each account input to a Beema Health backend target and a ${vendorLabel} field.`}
      </p>
      <div
        className={`rounded-xl border border-border overflow-hidden ${
          compact ? "text-[10px]" : "text-xs"
        }`}
      >
        <div
          className={`grid gap-2 bg-muted/40 px-2.5 py-1.5 font-medium text-muted-foreground ${
            backendReadOnly
              ? "grid-cols-[1.1fr_1fr_1fr]"
              : "grid-cols-[1.1fr_1fr_1fr]"
          }`}
        >
          <span>Input</span>
          <span>Backend</span>
          <span>{vendorLabel}</span>
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
                  ? backendLabelForValue(row.backend)
                  : "— validation only —"}
              </span>
            ) : (
              <select
                className={`${inputCls} ${compact ? "text-[10px] py-1" : "text-xs"}`}
                value={row.backend}
                disabled={disabled || row.key === "confirm_password"}
                onChange={(e) =>
                  updateRow(row.key, { backend: e.target.value })
                }
              >
                {BACKEND_FIELD_OPTIONS.map((opt) => (
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
                disabled ||
                row.key === "password" ||
                row.key === "confirm_password"
              }
              onChange={(e) => updateRow(row.key, { beluga: e.target.value })}
            >
              {belugaFields.map((opt) => (
                <option key={opt.value || "none"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Password fields are registration-only and are not sent to the vendor
        API. Re-enter password is used for client-side confirmation only.
      </p>
    </div>
  );
}
