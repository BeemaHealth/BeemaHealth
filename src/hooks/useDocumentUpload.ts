import { useCallback, useRef, useState, type ChangeEvent } from "react";
import {
  deleteDocument,
  fetchDocuments,
  isApiEnabled,
  patchDocumentType,
  uploadDocumentBatch,
} from "@/lib/api/client";
import type { DocumentType, UploadedDocument } from "@/lib/types/mvp";

export function useDocumentUpload() {
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busyDocumentId, setBusyDocumentId] = useState<string | null>(null);
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

  const handleUploadBatch = useCallback(
    async (items: { file: File; documentType: DocumentType }[]) => {
      if (!items.length) return;
      if (!isApiEnabled()) {
        setUploadError("Document upload requires the backend API.");
        return;
      }
      setUploadError("");
      setUploading(true);
      try {
        const newDocs = await uploadDocumentBatch(items);
        setUploadedDocs((prev) => [...prev, ...newDocs]);
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : "Could not upload file(s).",
        );
        throw err;
      } finally {
        setUploading(false);
      }
    },
    [],
  );

  const handleFilesSelected = useCallback(
    async (e: ChangeEvent<HTMLInputElement>, documentType?: DocumentType) => {
      const files = e.target.files;
      if (!files?.length) return;
      if (!documentType) {
        e.target.value = "";
        return;
      }
      try {
        await handleUploadBatch(
          Array.from(files).map((file) => ({ file, documentType })),
        );
      } catch {
        // uploadError already set
      } finally {
        e.target.value = "";
      }
    },
    [handleUploadBatch],
  );

  const removeDocument = useCallback(
    async (documentId: string): Promise<boolean> => {
      if (!isApiEnabled()) {
        setUploadError("Document upload requires the backend API.");
        return false;
      }
      setUploadError("");
      setBusyDocumentId(documentId);
      try {
        await deleteDocument(documentId);
        setUploadedDocs((prev) => prev.filter((doc) => doc.id !== documentId));
        return true;
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : "Could not remove document.",
        );
        return false;
      } finally {
        setBusyDocumentId(null);
      }
    },
    [],
  );

  const updateDocumentType = useCallback(
    async (documentId: string, documentType: DocumentType) => {
      if (!isApiEnabled()) {
        setUploadError("Document upload requires the backend API.");
        return;
      }
      setUploadError("");
      setBusyDocumentId(documentId);
      try {
        const updated = await patchDocumentType(documentId, documentType);
        setUploadedDocs((prev) =>
          prev.map((doc) => (doc.id === documentId ? updated : doc)),
        );
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : "Could not update document.",
        );
      } finally {
        setBusyDocumentId(null);
      }
    },
    [],
  );

  return {
    uploadedDocs,
    setUploadedDocs,
    uploadError,
    uploading,
    busyDocumentId,
    fileInputRef,
    loadDocuments,
    openFilePicker,
    handleFilesSelected,
    handleUploadBatch,
    removeDocument,
    updateDocumentType,
  };
}
