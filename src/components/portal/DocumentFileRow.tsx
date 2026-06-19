import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UPLOAD_DOCUMENT_TYPES } from "@/lib/api/client";
import type { DocumentType } from "@/lib/types/mvp";
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
  return (
    <li className="grid min-w-0 max-w-full gap-2 overflow-hidden rounded-xl border border-border bg-muted/20 px-3 py-2">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <span
          className="block min-w-0 truncate text-sm text-foreground"
          title={filename}
        >
          {filename}
        </span>
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
        className={`${inputCls} min-w-0 w-full max-w-full`}
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
