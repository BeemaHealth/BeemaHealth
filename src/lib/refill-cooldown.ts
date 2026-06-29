import type { RefillCooldown } from "@/lib/types/mvp";

export const REFILL_REQUEST_COOLDOWN_HOURS = 24;

export const REFILL_COOLDOWN_SUPPORT_EMAIL = "support@aretide.com";

export function isRefillCooldownActive(
  cooldown: RefillCooldown | null | undefined,
): boolean {
  return cooldown?.active === true;
}

export function formatRefillCooldownWaitMessage(
  cooldown: RefillCooldown,
): string {
  const hours = cooldown.hours_remaining ?? 0;
  if (hours >= 1) {
    const rounded = Math.ceil(hours);
    return `Please wait about ${rounded} more hour${rounded === 1 ? "" : "s"} before submitting another refill request.`;
  }
  return "Please wait a little while longer before submitting another refill request.";
}

export function getRefillCooldownBannerMessage(
  cooldown: RefillCooldown,
): string {
  return (
    `You submitted a refill request within the last ${REFILL_REQUEST_COOLDOWN_HOURS} hours. ` +
    `${formatRefillCooldownWaitMessage(cooldown)}`
  );
}

export function getRefillCooldownSupportMessage(): string {
  return (
    "If your medication has not arrived, contact support instead of submitting " +
    "another refill request."
  );
}

export function validateRefillRequestAllowed(
  cooldown: RefillCooldown | null | undefined,
): string | null {
  if (!isRefillCooldownActive(cooldown) || !cooldown) {
    return null;
  }
  return `${getRefillCooldownBannerMessage(cooldown)} ${getRefillCooldownSupportMessage()}`;
}
