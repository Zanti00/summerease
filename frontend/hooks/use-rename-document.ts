import { useState } from "react";
import { getAuthToken } from "@/lib/actions/authActions";
import { API_BASE_URL } from "@/lib/apiConfig";
import { renameFileInBucket } from "@/lib/supabase";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface UseRenameDocumentOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useRenameDocument(options?: UseRenameDocumentOptions) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [documentToRename, setDocumentToRename] = useState<{ id: string; oldName: string; bucket?: string } | null>(null);
  const queryClient = useQueryClient();

  const initiateRename = (id: string, oldName: string, bucket = "documents") => {
    setDocumentToRename({ id, oldName, bucket });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setDocumentToRename(null);
  };

  const handleConfirmRename = async (newName: string) => {
    if (!documentToRename) return;
    setIsRenaming(true);

    try {
      const token = await getAuthToken();
      let backendRenameSuccess = false;

      // 1. Try backend rename first (updates DB title and Supabase file if linked)
      if (token) {
        const renameRes = await fetch(`${API_BASE_URL}/documents/${documentToRename.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title: newName }),
        });

        if (renameRes.ok) {
          backendRenameSuccess = true;
        } else if (renameRes.status !== 404 && renameRes.status !== 401) {
          // If not 404, it's a real error (not just missing from DB)
          const errorData = await renameRes.json().catch(() => ({}));
          throw new Error(errorData.detail || "Failed to rename document in database");
        }
      }

      // 2. If it wasn't in the DB, rename directly in the Supabase bucket
      if (!backendRenameSuccess) {
        const oldFilePath = documentToRename.oldName;
        // Construct new file path (keep the UUID prefix if it exists)
        const docIdMatch = documentToRename.oldName.match(/^[a-f0-9-]{36}-/);
        const prefix = docIdMatch ? docIdMatch[0] : "";
        const sanitizedNewName = newName.replace(/[^a-zA-Z0-9.-]/g, "_");
        const newFilePath = `${prefix}${sanitizedNewName}`;
        
        // Prevent renaming if new name matches old name (ignoring prefix)
        if (oldFilePath !== newFilePath) {
          await renameFileInBucket(oldFilePath, newFilePath, documentToRename.bucket);
        }
      }

      toast.success("Document renamed successfully");
      queryClient.invalidateQueries({ queryKey: ["documents"] });

      handleCloseModal();
      if (options?.onSuccess) {
        options.onSuccess();
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to rename document");
      if (options?.onError) {
        options.onError(error);
      }
      throw error;
    } finally {
      setIsRenaming(false);
    }
  };

  return {
    initiateRename,
    isRenaming,
    isModalOpen,
    handleCloseModal,
    handleConfirmRename,
    documentToRename,
  };
}
