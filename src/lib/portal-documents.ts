import type { DocumentType } from "@/lib/types/mvp";

export type DocumentSlot = {
  type: DocumentType;
  title: string;
  optional?: boolean;
};

export const DOCUMENT_SLOTS: DocumentSlot[] = [
  { type: "photo_id", title: "Photo ID" },
  { type: "insurance_card", title: "Insurance card", optional: true },
  { type: "lab_results", title: "Lab result" },
];
