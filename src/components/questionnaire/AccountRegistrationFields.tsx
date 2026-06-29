import {
  Field,
  PasswordInput,
  inputCls,
} from "@/components/quiz/quiz-primitives";
import { formatPhoneInput } from "@/lib/form-validation";
import type { RegistrationFields } from "@/lib/questionnaire/registration";

type AccountRegistrationFieldsProps = {
  value: RegistrationFields;
  onChange: (next: RegistrationFields) => void;
  readOnly?: boolean;
  /** Flowchart node preview — flat, borderless inputs. */
  embedded?: boolean;
  error?: string;
};

export function AccountRegistrationFields({
  value,
  onChange,
  readOnly = false,
  embedded = false,
  error,
}: AccountRegistrationFieldsProps) {
  const set = (patch: Partial<RegistrationFields>) =>
    onChange({ ...value, ...patch });

  const inputClass = embedded
    ? "w-full rounded-lg border-0 bg-muted/40 px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50"
    : inputCls;

  return (
    <div className={embedded ? "space-y-1.5" : "grid gap-4"}>
      <div
        className={
          embedded ? "grid gap-1.5 sm:grid-cols-2" : "grid gap-3 sm:grid-cols-2"
        }
      >
        <Field label="Legal first name" required>
          <input
            type="text"
            className={inputClass}
            value={value.firstName}
            disabled={readOnly}
            onChange={(e) => set({ firstName: e.target.value })}
            autoComplete="given-name"
          />
        </Field>
        <Field label="Legal last name" required>
          <input
            type="text"
            className={inputClass}
            value={value.lastName}
            disabled={readOnly}
            onChange={(e) => set({ lastName: e.target.value })}
            autoComplete="family-name"
          />
        </Field>
      </div>
      <Field label="Phone" required>
        <input
          type="tel"
          className={inputClass}
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={14}
          value={value.phone}
          disabled={readOnly}
          onChange={(e) => set({ phone: formatPhoneInput(e.target.value) })}
        />
      </Field>
      <Field label="Email" required>
        <input
          type="email"
          className={inputClass}
          value={value.email}
          disabled={readOnly}
          onChange={(e) => set({ email: e.target.value })}
          autoComplete="email"
        />
      </Field>
      <Field label="Password (min 10 characters)" required>
        <PasswordInput
          value={value.password}
          onChange={readOnly ? undefined : (v) => set({ password: v })}
          autoComplete="new-password"
          className={embedded ? inputClass : undefined}
        />
      </Field>
      <Field label="Re-enter password" required>
        <PasswordInput
          value={value.confirmPassword}
          onChange={readOnly ? undefined : (v) => set({ confirmPassword: v })}
          autoComplete="new-password"
          className={embedded ? inputClass : undefined}
        />
      </Field>
      {!readOnly &&
      value.confirmPassword &&
      value.password !== value.confirmPassword ? (
        <p className="text-sm text-destructive">Passwords do not match.</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
