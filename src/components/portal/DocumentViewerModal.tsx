import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Eye, FileText, X, ZoomIn, ZoomOut } from "lucide-react";
import { Dialog, DialogPortal } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fetchUploadedDocumentPreview } from "@/lib/api/client";
import { getDocumentTypeMeta } from "@/lib/portal-documents";
import type { UploadedDocument } from "@/lib/types/mvp";
import { cn } from "@/lib/utils";

function previewKind(
  contentType: string,
  filename: string,
): "image" | "pdf" | "other" {
  const type = contentType.toLowerCase();
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf") return "pdf";

  const lower = filename.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|heic|heif)$/i.test(lower)) return "image";
  if (lower.endsWith(".pdf")) return "pdf";
  return "other";
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

export function DocumentViewerModal({
  document,
  open,
  onOpenChange,
}: {
  document: UploadedDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [contentType, setContentType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!open || !document) {
      setError("");
      setContentType("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    void fetchUploadedDocumentPreview(document)
      .then((preview) => {
        if (cancelled) {
          URL.revokeObjectURL(preview.objectUrl);
          return;
        }
        setPreviewUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return preview.objectUrl;
        });
        setContentType(preview.contentType);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load this document.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, document]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
      setContentType("");
      setError("");
      setZoom(1);
    }
    onOpenChange(nextOpen);
  }

  const filename = document?.original_filename || "Document";
  const meta = document ? getDocumentTypeMeta(document.document_type) : null;
  const kind = previewKind(contentType, filename);
  const showZoom = !loading && !error && previewUrl && kind === "image";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <DialogPrimitive.Content
            className={cn(
              "relative flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col gap-3 overflow-hidden",
              "rounded-3xl border bg-background p-4 shadow-lg sm:gap-4 sm:p-6",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            )}
          >
            <div className="shrink-0 pr-8">
              <DialogPrimitive.Title className="truncate text-lg font-semibold leading-none tracking-tight">
                {filename}
              </DialogPrimitive.Title>
              {meta ? (
                <DialogPrimitive.Description className="mt-1.5 text-sm text-muted-foreground">
                  {meta.label}
                </DialogPrimitive.Description>
              ) : null}
            </div>

            <div
              className={cn(
                "min-h-0 flex-1 overflow-auto overscroll-contain rounded-2xl border border-border bg-muted/30",
                kind === "pdf" ? "p-0" : "p-2 sm:p-4",
              )}
            >
              {loading ? (
                <div className="flex min-h-[40vh] items-center justify-center">
                  <p className="text-sm text-muted-foreground">
                    Loading document…
                  </p>
                </div>
              ) : null}

              {!loading && error ? (
                <div className="flex min-h-[40vh] items-center justify-center px-4 text-center">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              ) : null}

              {!loading && !error && previewUrl && kind === "image" ? (
                <div className="flex min-h-full min-w-full items-center justify-center">
                  <img
                    src={previewUrl}
                    alt={filename}
                    className="h-auto w-auto max-w-full rounded-xl object-contain transition-transform duration-150 ease-out"
                    style={{
                      transform: `scale(${zoom})`,
                      transformOrigin: "center center",
                      touchAction: "pan-x pan-y pinch-zoom",
                    }}
                  />
                </div>
              ) : null}

              {!loading && !error && previewUrl && kind === "pdf" ? (
                <iframe
                  src={previewUrl}
                  title={filename}
                  className="h-[min(70dvh,600px)] w-full rounded-xl bg-card"
                />
              ) : null}

              {!loading && !error && previewUrl && kind === "other" ? (
                <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4 text-center">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <FileText className="size-6" aria-hidden />
                  </span>
                  <p className="text-sm text-muted-foreground">
                    Preview is not available for this file type.
                  </p>
                  <a
                    href={previewUrl}
                    download={filename}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Download {filename}
                  </a>
                </div>
              ) : null}
            </div>

            {showZoom ? (
              <div className="flex shrink-0 items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9 rounded-xl"
                  aria-label="Zoom out"
                  disabled={zoom <= MIN_ZOOM}
                  onClick={() =>
                    setZoom((current) =>
                      Math.max(MIN_ZOOM, current - ZOOM_STEP),
                    )
                  }
                >
                  <ZoomOut className="size-4" />
                </Button>
                <span className="min-w-14 text-center text-sm tabular-nums text-muted-foreground">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9 rounded-xl"
                  aria-label="Zoom in"
                  disabled={zoom >= MAX_ZOOM}
                  onClick={() =>
                    setZoom((current) =>
                      Math.min(MAX_ZOOM, current + ZOOM_STEP),
                    )
                  }
                >
                  <ZoomIn className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setZoom(1)}
                >
                  Reset
                </Button>
              </div>
            ) : null}

            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-xl p-1 opacity-70 ring-offset-background transition-opacity hover:bg-muted hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </div>
      </DialogPortal>
    </Dialog>
  );
}

export function ViewDocumentButton({
  disabled,
  onClick,
}: {
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-primary/20 bg-card/90 px-4 text-sm font-medium text-primary transition-colors hover:bg-card disabled:opacity-50 sm:ml-4"
      disabled={disabled}
      onClick={onClick}
    >
      <Eye className="size-3.5" aria-hidden />
      View document
    </button>
  );
}
