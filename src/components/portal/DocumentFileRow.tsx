import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UPLOAD_DOCUMENT_TYPES } from "@/lib/api/client";
import { getDocumentTypeMeta } from "@/lib/portal-documents";
import type { DocumentType } from "@/lib/types/mvp";
import { cn } from "@/lib/utils";
import { inputCls } from "@/components/quiz/quiz-primitives";

export function DocumentFileRow({
  filename,
  documentType,
  disabled,
  onTypeChange,
  onRemove,
  showPlaceholder,
}: {
  filename: string;
  documentType: DocumentType | "";
  disabled?: boolean;
  onTypeChange: (documentType: DocumentType) => void;
  onRemove: () => void;
  showPlaceholder?: boolean;
}) {
  const meta = documentType ? getDocumentTypeMeta(documentType) : null;
  const Icon = meta?.icon;

  return (
    <li
      className={cn(
        "grid min-w-0 max-w-full gap-3 overflow-hidden rounded-2xl border px-3 py-3",
        meta ? meta.section : "border-border bg-muted/25",
      )}
    >
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {meta && Icon ? (
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl",
                meta.iconWrap,
              )}
            >
              <Icon className="size-4" aria-hidden />
            </span>
          ) : null}
          <div className="min-w-0">
            {meta ? (
              <p className="text-sm font-medium text-foreground">
                {meta.label}
              </p>
            ) : null}
            <span
              className={cn(
                "block min-w-0 truncate text-sm",
                meta ? "text-muted-foreground" : "text-foreground",
              )}
              title={filename}
            >
              {filename}
            </span>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 rounded-lg text-muted-foreground hover:text-destructive"
          disabled={disabled}
          onClick={onRemove}
          aria-label={`Remove ${filename}`}
        >
          <X className="size-4" />
        </Button>
      </div>
      <select
        className={cn(inputCls, "min-w-0 w-full max-w-full bg-card/90")}
        value={documentType}
        disabled={disabled}
        onChange={(e) => onTypeChange(e.target.value as DocumentType)}
        aria-label={`Document type for ${filename}`}
      >
        {showPlaceholder && (
          <option value="" disabled>
            Select type
          </option>
        )}
        {UPLOAD_DOCUMENT_TYPES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </li>
  );
}
