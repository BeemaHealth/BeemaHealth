import type {
  Address,
  AddressInput,
  DataRequest,
  DataRequestKind,
  DataRequestStatus,
} from "@/lib/api/portal/account";
import type {
  Invoice,
  InvoiceStatus,
  PaymentMethod,
} from "@/lib/api/portal/billing";

export const ACCOUNT_TABS = ["profile", "billing", "phi"] as const;
export type AccountTab = (typeof ACCOUNT_TABS)[number];

export function parseAccountTab(value: unknown): AccountTab {
  return (ACCOUNT_TABS as readonly string[]).includes(value as string)
    ? (value as AccountTab)
    : "profile";
}

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

export function validateName(v: string, label: string): string | null {
  const t = v.trim();
  if (!t) return `${label} is required.`;
  if (t.length > 150) return `${label} is too long.`;
  if (CONTROL.test(t)) return `${label} has invalid characters.`;
  return null;
}

/** 10 digits (or 11 with a leading 1). Empty is allowed. */
export function validatePhone(v: string): string | null {
  const t = v.trim();
  if (!t) return null;
  if (!/^[\d\s().+-]+$/.test(t)) return "Enter a valid phone number.";
  const digits = t.replace(/\D/g, "");
  if (digits.length === 10 || (digits.length === 11 && digits.startsWith("1")))
    return null;
  return "Enter a valid 10 digit phone number.";
}

export function formatPhone(v: string): string {
  const digits = v.replace(/\D/g, "");
  const d =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (d.length !== 10) return v;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

const US_STATES = new Set(
  "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(
    " ",
  ),
);

export type AddressErrors = Partial<Record<keyof AddressInput, string>>;

export function validateAddress(a: AddressInput): AddressErrors {
  const e: AddressErrors = {};
  const line1 = a.line1.trim();
  if (!line1) e.line1 = "Street address is required.";
  else if (line1.length > 200 || CONTROL.test(line1))
    e.line1 = "Enter a valid street address.";
  if (a.line2.length > 200 || CONTROL.test(a.line2))
    e.line2 = "Enter a valid apartment or suite.";
  const city = a.city.trim();
  if (!city) e.city = "City is required.";
  else if (city.length > 100 || CONTROL.test(city))
    e.city = "Enter a valid city.";
  if (!US_STATES.has(a.state.trim().toUpperCase()))
    e.state = "Enter a 2 letter US state.";
  if (!/^\d{5}(-\d{4})?$/.test(a.zip_code.trim()))
    e.zip_code = "Enter a valid ZIP code.";
  return e;
}

export function normalizeAddress(a: AddressInput): AddressInput {
  return {
    ...a,
    line1: a.line1.trim(),
    line2: a.line2.trim(),
    city: a.city.trim(),
    state: a.state.trim().toUpperCase(),
    zip_code: a.zip_code.trim(),
  };
}

export function formatAddress(a: Address): string {
  const street = [a.line1, a.line2].filter(Boolean).join(", ");
  return `${street}, ${a.city}, ${a.state} ${a.zip_code}`;
}

export function emptyAddress(): AddressInput {
  return {
    kind: "shipping",
    line1: "",
    line2: "",
    city: "",
    state: "",
    zip_code: "",
    is_default: false,
  };
}

export function brandLabel(brand: string): string {
  if (!brand) return "Card";
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

export function cardExpiry(
  m: Pick<PaymentMethod, "exp_month" | "exp_year">,
): string {
  return `${String(m.exp_month).padStart(2, "0")}/${String(m.exp_year).slice(-2)}`;
}

export function isCardExpired(
  m: Pick<PaymentMethod, "exp_month" | "exp_year">,
  now: Date = new Date(),
): boolean {
  const firstOfNextMonth = new Date(m.exp_year, m.exp_month, 1);
  return firstOfNextMonth.getTime() <= now.getTime();
}

export function invoiceTone(
  status: InvoiceStatus,
): "success" | "warning" | "info" | "muted" {
  switch (status) {
    case "paid":
      return "success";
    case "failed":
    case "open":
      return "warning";
    case "refunded":
    case "partially_refunded":
      return "info";
    default:
      return "muted";
  }
}

export function invoiceLabel(i: Pick<Invoice, "status">): string {
  if (i.status === "partially_refunded") return "Partially refunded";
  return i.status.charAt(0).toUpperCase() + i.status.slice(1);
}

export function openDataRequest(
  list: DataRequest[],
  kind: DataRequestKind,
): DataRequest | null {
  return (
    list.find(
      (r) =>
        r.kind === kind &&
        (r.status === "requested" || r.status === "in_review"),
    ) ?? null
  );
}

export const DATA_REQUEST_STATUS_LABELS: Record<DataRequestStatus, string> = {
  requested: "Requested",
  in_review: "In review",
  completed: "Completed",
  denied: "Denied",
};

export function exportFilename(now: Date = new Date()): string {
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `beema-health-data-${now.getFullYear()}-${mm}-${dd}.json`;
}
