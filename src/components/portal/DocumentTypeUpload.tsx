import { useRef, useState, type ChangeEvent } from "react";
import { CloudUpload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UPLOAD_DOCUMENT_TYPES } from "@/lib/api/client";
import type { DocumentType } from "@/lib/types/mvp";
import { inputCls } from "@/components/quiz/quiz-primitives";

export type DocumentUploadItem = {
  file: File;
  documentType: DocumentType;
};

type PendingFile = {
  id: string;
  file: File;
  documentType: DocumentType | "";
};

export function DocumentTypeUpload({
  onUpload,
  uploading,
  error,
  disabled,
}: {
  onUpload: (items: DocumentUploadItem[]) => Promise<void>;
  uploading?: boolean;
  error?: string;
  disabled?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingFile[]>([]);

  const allTypesSelected =
    pending.length > 0 && pending.every((item) => item.documentType !== "");

  function handlePickFiles() {
    fileInputRef.current?.click();
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setPending((prev) => [
      ...prev,
      ...Array.from(files).map((file) => ({
        id: crypto.randomUUID(),
        file,
        documentType: "" as const,
      })),
    ]);
    e.target.value = "";
  }

  function removePending(id: string) {
    setPending((prev) => prev.filter((item) => item.id !== id));
  }

  function setPendingType(id: string, documentType: DocumentType) {
    setPending((prev) =>
      prev.map((item) => (item.id === id ? { ...item, documentType } : item)),
    );
  }

  async function handleUpload() {
    if (!allTypesSelected || uploading || disabled) return;
    const items = pending.map((item) => ({
      file: item.file,
      documentType: item.documentType as DocumentType,
    }));
    await onUpload(items);
    setPending([]);
  }

  return (
    <div className="grid gap-3">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,.webp,application/pdf,image/*"
        disabled={disabled || uploading}
        onChange={handleChange}
      />
      <Button
        type="button"
        variant="outline"
        className="w-fit rounded-xl"
        onClick={handlePickFiles}
        disabled={disabled || uploading}
      >
        <CloudUpload className="size-4" />
        Choose file(s)
      </Button>

      {pending.length > 0 && (
        <ul className="grid gap-2">
          {pending.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2"
            >
              <span
                className="min-w-0 flex-1 truncate text-sm text-foreground"
                title={item.file.name}
              >
                {item.file.name}
              </span>
              <select
                className={`${inputCls} w-auto min-w-[10rem]`}
                value={item.documentType}
                disabled={disabled || uploading}
                onChange={(e) =>
                  setPendingType(item.id, e.target.value as DocumentType)
                }
                aria-label={`Document type for ${item.file.name}`}
              >
                <option value="" disabled>
                  Select type
                </option>
                {UPLOAD_DOCUMENT_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 rounded-lg"
                disabled={disabled || uploading}
                onClick={() => removePending(item.id)}
                aria-label={`Remove ${item.file.name}`}
              >
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {pending.length > 0 && (
        <Button
          type="button"
          className="w-fit rounded-xl"
          onClick={() => void handleUpload()}
          disabled={disabled || uploading || !allTypesSelected}
        >
          {uploading
            ? "Uploading…"
            : `Upload ${pending.length} file${pending.length === 1 ? "" : "s"}`}
        </Button>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
