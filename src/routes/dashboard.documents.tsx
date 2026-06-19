import { useEffect, useRef, type ChangeEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DocumentRow } from "@/components/portal/DocumentRow";
import { DocumentTypeUpload } from "@/components/portal/DocumentTypeUpload";
import { UploadedDocumentsList } from "@/components/portal/UploadedDocumentsList";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { DOCUMENT_SLOTS } from "@/lib/portal-documents";
import { fetchDocuments } from "@/lib/api/client";
import { useDocumentUpload } from "@/hooks/useDocumentUpload";
import type { DocumentType, UploadedDocument } from "@/lib/types/mvp";

export const Route = createFileRoute("/dashboard/documents")({
  loader: async () => {
    try {
      return await fetchDocuments();
    } catch {
      return [] as UploadedDocument[];
    }
  },
  component: DashboardDocumentsPage,
});

function DashboardDocumentsPage() {
  const docs = Route.useLoaderData();
  const upload = useDocumentUpload();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    upload.setUploadedDocs(docs);
  }, [docs, upload]);

  const pendingDocType = useRef<DocumentType | undefined>(undefined);

  function handleSlotUpload(slotType: DocumentType) {
    pendingDocType.current = slotType;
    upload.openFilePicker();
  }

  function handleFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    void upload.handleFilesSelected(e, pendingDocType.current);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PortalPageHeader
        title="Documents"
        subtitle="Upload and manage the documents your clinician may need."
      />
      <input
        ref={upload.fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,.webp,application/pdf,image/*"
        onChange={handleFileInputChange}
      />
      <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <h2 className="font-semibold text-foreground">Upload a document</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose your files, then select a type for each before uploading.
        </p>
        <div className="mt-4">
          <DocumentTypeUpload
            uploading={upload.uploading}
            error={upload.uploadError}
            onUpload={upload.handleUploadBatch}
          />
          <UploadedDocumentsList
            documents={upload.uploadedDocs}
            busyDocumentId={upload.busyDocumentId}
            onTypeChange={(id, type) =>
              void upload.updateDocumentType(id, type)
            }
            onRemove={(id) => void upload.removeDocument(id)}
          />
        </div>
      </section>
      <div className="space-y-4">
        {DOCUMENT_SLOTS.map((slot) => (
          <DocumentRow
            key={slot.title}
            slot={slot}
            doc={findDocForSlot(upload.uploadedDocs, slot)}
            uploading={upload.uploading}
            onUpload={() => handleSlotUpload(slot.type)}
          />
        ))}
      </div>
      <p className="rounded-2xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        Insurance card is optional but can help your clinician personalize your
        care. Files are private and never sold.
      </p>
    </div>
  );
}

function findDocForSlot(
  docs: UploadedDocument[],
  slot: (typeof DOCUMENT_SLOTS)[number],
): UploadedDocument | undefined {
  return docs.find((d) => d.document_type === slot.type);
}
