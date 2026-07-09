export const PAYMENT_HOLD_PLUGIN_ID = "stripe_payment_hold";

export type PaymentHoldMode = "auth_hold" | "setup_only";

export const PAYMENT_HOLD_MODES: readonly PaymentHoldMode[] = [
  "auth_hold",
  "setup_only",
];

export function isPaymentField(field: {
  field_type: string;
  plugin_id?: string;
}): boolean {
  return (
    field.field_type === "plugin" && field.plugin_id === PAYMENT_HOLD_PLUGIN_ID
  );
}
