import type { LucideIcon } from "lucide-react";
import { FileImage, FileText, FlaskConical, IdCard } from "lucide-react";
import { documentTypeLabel } from "@/lib/api/client";
import type { DocumentType, UploadedDocument } from "@/lib/types/mvp";

export type DocumentTypeMeta = {
  label: string;
  icon: LucideIcon;
  iconWrap: string;
  section: string;
};

const DOCUMENT_TYPE_ORDER: DocumentType[] = [
  "photo_id",
  "insurance_card",
  "lab_results",
  "other",
];

export function getDocumentTypeMeta(type: DocumentType): DocumentTypeMeta {
  switch (type) {
    case "photo_id":
      return {
        label: documentTypeLabel(type),
        icon: IdCard,
        iconWrap: "bg-secondary/20 text-secondary",
        section: "border-secondary/20 bg-secondary/10",
      };
    case "insurance_card":
      return {
        label: documentTypeLabel(type),
        icon: FileText,
        iconWrap: "bg-warning/25 text-warning-foreground",
        section: "border-warning/30 bg-warning/12",
      };
    case "lab_results":
      return {
        label: documentTypeLabel(type),
        icon: FlaskConical,
        iconWrap: "bg-success/20 text-success",
        section: "border-success/25 bg-success/10",
      };
    default:
      return {
        label: documentTypeLabel(type),
        icon: FileImage,
        iconWrap: "bg-muted text-muted-foreground",
        section: "border-border bg-muted/30",
      };
  }
}

export function sortUploadedDocuments(
  documents: UploadedDocument[],
): UploadedDocument[] {
  return [...documents].sort(
    (a, b) =>
      DOCUMENT_TYPE_ORDER.indexOf(a.document_type) -
      DOCUMENT_TYPE_ORDER.indexOf(b.document_type),
  );
}
