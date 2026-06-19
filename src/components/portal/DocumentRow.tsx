import { CloudUpload, FileText, ImageIcon, IdCard } from "lucide-react";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { Button } from "@/components/ui/button";
import type { DocumentSlot } from "@/lib/portal-documents";
import type { UploadedDocument } from "@/lib/types/mvp";

function slotIcon(type: DocumentSlot["type"]) {
  switch (type) {
    case "photo_id":
      return IdCard;
    case "insurance_card":
      return FileText;
    case "lab_results":
      return FileText;
    default:
      return ImageIcon;
  }
}

export function DocumentRow({
  slot,
  doc,
  onUpload,
  uploading,
}: {
  slot: DocumentSlot;
  doc?: UploadedDocument;
  onUpload: () => void;
  uploading?: boolean;
}) {
  const Icon = slotIcon(slot.type);
  const status = doc
    ? doc.file_url
      ? { label: "Uploaded", tone: "success" as const }
      : { label: "In review", tone: "info" as const }
    : { label: "Missing", tone: "muted" as const };

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between md:p-5">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Icon className="size-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{slot.title}</p>
          <p className="text-sm text-muted-foreground">
            {doc?.original_filename
              ? doc.original_filename
              : slot.optional
                ? "Optional — not uploaded yet"
                : "Not uploaded yet"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 sm:shrink-0">
        <StatusBadge label={status.label} tone={status.tone} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          onClick={onUpload}
          disabled={uploading}
        >
          <CloudUpload className="size-4" />
          Upload
        </Button>
      </div>
    </div>
  );
}
