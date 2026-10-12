import type { TreatmentTab } from "@/lib/api/portal/treatments";

export const treatmentKeys = {
  list: (tab: TreatmentTab) => ["portal", "treatments", tab] as const,
  all: ["portal", "treatments"] as const,
  items: ["portal", "action-items"] as const,
  subs: ["portal", "subscriptions"] as const,
  shipment: ["portal", "next-shipment"] as const,
};

export const shotsKeys = {
  doses: ["portal", "shots", "doses"] as const,
  metrics: ["portal", "shots", "metrics"] as const,
};

export const chatKeys = {
  list: ["portal", "chat", "conversations"] as const,
  thread: (id: string) => ["portal", "chat", "thread", id] as const,
};

export const accountKeys = {
  me: ["portal", "account", "me"] as const,
  profile: ["portal", "account", "profile"] as const,
  addresses: ["portal", "account", "addresses"] as const,
  methods: ["portal", "account", "payment-methods"] as const,
  invoices: ["portal", "account", "invoices"] as const,
  dataRequests: ["portal", "account", "data-requests"] as const,
};
