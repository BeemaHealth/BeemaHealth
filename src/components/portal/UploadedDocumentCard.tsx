import { Trash2 } from "lucide-react";
import { useState } from "react";
import {
  DocumentViewerModal,
  ViewDocumentButton,
} from "@/components/portal/DocumentViewerModal";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { Button } from "@/components/ui/button";
import { UPLOAD_DOCUMENT_TYPES } from "@/lib/api/client";
import { getDocumentTypeMeta } from "@/lib/portal-documents";
import type { DocumentType, UploadedDocument } from "@/lib/types/mvp";
import { cn } from "@/lib/utils";
import { inputCls } from "@/components/quiz/quiz-primitives";

function documentStatus(doc: UploadedDocument) {
  if (doc.file_url) {
    return { label: "Uploaded", tone: "success" as const };
  }
  return { label: "In review", tone: "info" as const };
}

function formatUploadedAt(timestamp: string) {
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function UploadedDocumentCard({
  document,
  busy,
  onTypeChange,
  onRemove,
}: {
  document: UploadedDocument;
  busy?: boolean;
  onTypeChange: (documentType: DocumentType) => void;
  onRemove: () => void | Promise<void>;
}) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const meta = getDocumentTypeMeta(document.document_type);
  const Icon = meta.icon;
  const status = documentStatus(document);
  const filename = document.original_filename || "Document";
  const canView = Boolean(document.file_url);
  const canEditType = UPLOAD_DOCUMENT_TYPES.some(
    (option) => option.value === document.document_type,
  );

  return (
    <>
      <section
        className={cn(
          "rounded-3xl border p-4 shadow-soft md:p-5",
          meta.section,
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <span
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-2xl",
                meta.iconWrap,
              )}
            >
              <Icon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{meta.label}</p>
              <p
                className="mt-0.5 truncate text-sm text-muted-foreground"
                title={filename}
              >
                {filename}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Uploaded {formatUploadedAt(document.uploaded_at)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
            <StatusBadge label={status.label} tone={status.tone} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl border-border/80 bg-card/80"
              disabled={busy}
              onClick={() => void onRemove()}
            >
              <Trash2 className="size-4" />
              Remove
            </Button>
          </div>
        </div>

        {(canEditType || canView) && (
          <div className="mt-4 border-t border-border/60 pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              {canEditType ? (
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor={`doc-type-${document.id}`}
                    className="mb-1.5 block text-xs font-medium text-muted-foreground"
                  >
                    Document type
                  </label>
                  <select
                    id={`doc-type-${document.id}`}
                    className={cn(inputCls, "w-full max-w-xs bg-card/90")}
                    value={document.document_type}
                    disabled={busy}
                    onChange={(e) =>
                      onTypeChange(e.target.value as DocumentType)
                    }
                  >
                    {UPLOAD_DOCUMENT_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex-1" />
              )}

              {canView ? (
                <ViewDocumentButton
                  disabled={busy}
                  onClick={() => setViewerOpen(true)}
                />
              ) : null}
            </div>
          </div>
        )}
      </section>

      <DocumentViewerModal
        document={document}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
      />
    </>
  );
}
