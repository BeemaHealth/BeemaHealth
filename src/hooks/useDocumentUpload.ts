import { useCallback, useRef, useState, type ChangeEvent } from "react";
import {
  createDocumentUpload,
  fetchDocuments,
  inferDocumentType,
  isApiEnabled,
  uploadDocumentFile,
} from "@/lib/api/client";
import type { DocumentType, UploadedDocument } from "@/lib/types/mvp";

export function useDocumentUpload() {
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = useCallback(async () => {
    if (!isApiEnabled()) return [];
    const docs = await fetchDocuments();
    setUploadedDocs(docs);
    return docs;
  }, []);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFilesSelected = useCallback(
    async (e: ChangeEvent<HTMLInputElement>, documentType?: DocumentType) => {
      const files = e.target.files;
      if (!files?.length) return;
      if (!isApiEnabled()) {
        setUploadError("Document upload requires the backend API.");
        e.target.value = "";
        return;
      }
      setUploadError("");
      setUploading(true);
      try {
        const newDocs: UploadedDocument[] = [];
        for (const file of Array.from(files)) {
          const response = await createDocumentUpload({
            document_type: documentType ?? inferDocumentType(file.name),
            filename: file.name,
            content_type: file.type || "application/octet-stream",
          });
          await uploadDocumentFile(file, response);
          newDocs.push(response.document);
        }
        setUploadedDocs((prev) => [...prev, ...newDocs]);
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : "Could not upload file(s).",
        );
      } finally {
        setUploading(false);
        e.target.value = "";
      }
    },
    [],
  );

  return {
    uploadedDocs,
    setUploadedDocs,
    uploadError,
    uploading,
    fileInputRef,
    loadDocuments,
    openFilePicker,
    handleFilesSelected,
  };
}
