import { useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { DocumentTypeUpload } from "@/components/portal/DocumentTypeUpload";
import { UploadedDocumentCard } from "@/components/portal/UploadedDocumentCard";
import { PortalPageHeader } from "@/components/portal/PortalPageHeader";
import { sortUploadedDocuments } from "@/lib/portal-documents";
import { fetchDocuments } from "@/lib/api/client";
import { useDocumentUpload } from "@/hooks/useDocumentUpload";
import type { UploadedDocument } from "@/lib/types/mvp";

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
  const uploadedDocs = sortUploadedDocuments(upload.uploadedDocs);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    upload.setUploadedDocs(docs);
  }, [docs, upload]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PortalPageHeader
        title="Documents"
        subtitle="Upload and manage the documents your clinician may need."
      />

      <section className="rounded-3xl border border-primary/15 bg-primary-soft/40 p-5 shadow-soft md:p-6">
        <h2 className="font-semibold text-primary">Upload a document</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose your files, then select a type for each before uploading.
        </p>
        <div className="mt-4">
          <DocumentTypeUpload
            uploading={upload.uploading}
            error={upload.uploadError}
            onUpload={upload.handleUploadBatch}
          />
        </div>
      </section>

      {uploadedDocs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Your documents
          </h2>
          {uploadedDocs.map((doc) => (
            <UploadedDocumentCard
              key={doc.id}
              document={doc}
              busy={upload.busyDocumentId === doc.id}
              onTypeChange={(type) =>
                void upload.updateDocumentType(doc.id, type)
              }
              onRemove={async () => {
                const filename = doc.original_filename || "Document";
                const removed = await upload.removeDocument(doc.id);
                if (removed) {
                  toast.success("Document removed", {
                    description: `Successfully removed ${filename}.`,
                  });
                }
              }}
            />
          ))}
        </div>
      )}

      <p className="rounded-2xl border border-border/80 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        Insurance card is optional but can help your clinician personalize your
        care. Files are private and never sold.
      </p>
    </div>
  );
}
