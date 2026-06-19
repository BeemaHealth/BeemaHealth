import { useRef, useState, type ChangeEvent } from "react";
import { CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UPLOAD_DOCUMENT_TYPES } from "@/lib/api/client";
import type { DocumentType } from "@/lib/types/mvp";
import { inputCls } from "@/components/quiz/quiz-primitives";

export function DocumentTypeUpload({
  onFilesSelected,
  uploading,
  error,
  disabled,
}: {
  onFilesSelected: (files: FileList, documentType: DocumentType) => void;
  uploading?: boolean;
  error?: string;
  disabled?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentType, setDocumentType] = useState<DocumentType>("lab_results");

  function handlePickFiles() {
    fileInputRef.current?.click();
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    onFilesSelected(files, documentType);
    e.target.value = "";
  }

  return (
    <div className="grid gap-3">
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium text-foreground">Document type</span>
        <select
          className={inputCls}
          value={documentType}
          disabled={disabled || uploading}
          onChange={(e) => setDocumentType(e.target.value as DocumentType)}
        >
          {UPLOAD_DOCUMENT_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
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
        {uploading ? "Uploading…" : "Choose file(s)"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
