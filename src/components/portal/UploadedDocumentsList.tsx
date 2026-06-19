import { UPLOAD_DOCUMENT_TYPES } from "@/lib/api/client";
import type { DocumentType, UploadedDocument } from "@/lib/types/mvp";
import { DocumentFileRow } from "@/components/portal/DocumentFileRow";

function editableDocumentType(type: DocumentType): DocumentType | "" {
  return UPLOAD_DOCUMENT_TYPES.some((option) => option.value === type)
    ? type
    : "";
}

export function UploadedDocumentsList({
  documents,
  disabled,
  busyDocumentId,
  onTypeChange,
  onRemove,
}: {
  documents: UploadedDocument[];
  disabled?: boolean;
  busyDocumentId?: string | null;
  onTypeChange: (documentId: string, documentType: DocumentType) => void;
  onRemove: (documentId: string) => void;
}) {
  if (documents.length === 0) return null;

  return (
    <ul className="mt-3 grid min-w-0 gap-2">
      {documents.map((doc) => {
        const busy = busyDocumentId === doc.id;
        const label = doc.original_filename || "Document";
        return (
          <DocumentFileRow
            key={doc.id}
            filename={label}
            documentType={editableDocumentType(doc.document_type)}
            disabled={disabled || busy}
            showPlaceholder={!editableDocumentType(doc.document_type)}
            onTypeChange={(type) => onTypeChange(doc.id, type)}
            onRemove={() => onRemove(doc.id)}
          />
        );
      })}
    </ul>
  );
}
