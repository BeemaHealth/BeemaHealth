import { useRef, useState } from "react";
import { FileCheck2, Upload, X } from "lucide-react";
import { ApiError } from "@/lib/api/portal/client";
import { uploadFile } from "@/lib/api/portal/questionnaire";
import { Button } from "@/components/ui/button";
import { ALLOWED_UPLOAD_TYPES, validateUploadFile } from "../node-validation";
import { ContinueButton, ErrorNote, NodeFrame } from "../ui";
import type { NodeRendererProps } from "../types";

type Uploaded = { fileId: string; label: string };

/** file_input and id_photo. Files go straight to presigned storage; only ids reach the answer. */
export function FileNode({
  node,
  layout,
  busy,
  error,
  onSubmit,
}: NodeRendererProps) {
  const kind = node.file_kind ?? (node.type === "id_photo" ? "id_photo" : "");
  const max = node.max_files ?? 1;
  const required = node.required !== false;
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<Uploaded[]>([]);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function onPick(list: FileList | null) {
    if (!list || list.length === 0) return;
    setLocalError(null);
    const picked = Array.from(list).slice(0, Math.max(0, max - files.length));
    if (picked.length < list.length)
      setLocalError(`You can upload up to ${max} file${max === 1 ? "" : "s"}.`);
    setUploading(true);
    const done: Uploaded[] = [];
    try {
      for (const file of picked) {
        const problem = validateUploadFile(file);
        if (problem) {
          setLocalError(problem);
          break;
        }
        const fileId = await uploadFile(kind, file);
        done.push({
          fileId,
          label: `Photo or document ${files.length + done.length + 1}`,
        });
      }
    } catch (err) {
      setLocalError(
        err instanceof ApiError
          ? err.message
          : "The upload did not finish. Please try again.",
      );
    } finally {
      setFiles((f) => [...f, ...done]);
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function submit() {
    if (files.length === 0) {
      setLocalError("Upload a file to continue.");
      return;
    }
    await onSubmit({ file_ids: files.map((f) => f.fileId) });
  }

  const working = busy || uploading;
  return (
    <NodeFrame title={node.title} body={node.body} icon={node.icon}>
      <form
        className="flex flex-col gap-6"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label
          htmlFor={`file-${node.id}`}
          className="flex cursor-pointer flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-border bg-card p-8 text-center shadow-soft transition-colors hover:border-primary hover:bg-primary-soft focus-within:ring-2 focus-within:ring-ring"
        >
          <Upload
            className="h-8 w-8 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="text-base font-semibold text-foreground">
            {uploading
              ? "Uploading"
              : files.length
                ? "Add another file"
                : "Choose a photo or file"}
          </span>
          <span className="text-sm text-muted-foreground">
            {layout.copy?.upload_hint ??
              "JPG, PNG, WebP, HEIC or PDF, up to 10 MB."}
          </span>
          <input
            ref={inputRef}
            id={`file-${node.id}`}
            type="file"
            className="sr-only"
            accept={ALLOWED_UPLOAD_TYPES.join(",")}
            multiple={max > 1}
            disabled={working || files.length >= max}
            onChange={(e) => void onPick(e.target.files)}
          />
        </label>

        {files.length > 0 ? (
          <ul className="flex flex-col gap-2" aria-label="Uploaded files">
            {files.map((f) => (
              <li
                key={f.fileId}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft"
              >
                <span className="flex items-center gap-2 text-base text-foreground">
                  <FileCheck2
                    className="h-5 w-5 text-success"
                    aria-hidden="true"
                  />
                  {f.label}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${f.label}`}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() =>
                    setFiles((all) => all.filter((x) => x.fileId !== f.fileId))
                  }
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <ErrorNote message={localError ?? error} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <ContinueButton
            label={layout.copy?.continue ?? "Continue"}
            busy={busy}
            disabled={uploading}
          />
          {!required ? (
            <Button
              type="button"
              variant="ghost"
              disabled={working}
              onClick={() => void onSubmit({ skipped: true })}
            >
              Skip for now
            </Button>
          ) : null}
        </div>
      </form>
    </NodeFrame>
  );
}
