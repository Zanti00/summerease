import { useState } from "react";
import { getAuthToken } from "@/lib/actions/authActions";
import { API_BASE_URL } from "@/lib/apiConfig";
import { deleteFileFromBucket } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

interface UseDeleteDocumentOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useDeleteDocument(options?: UseDeleteDocumentOptions) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<{ id: string; name: string; bucket?: string } | null>(null);
  const { user } = useAuth();
  const isOAuth = !!user?.google_id;

  const initiateDelete = (id: string, name: string, bucket = "documents") => {
    setDocumentToDelete({ id, name, bucket });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setDocumentToDelete(null);
  };

  const handleConfirmDelete = async (passwordOrEmail: string) => {
    if (!documentToDelete) return;
    setIsDeleting(true);

    try {
      const token = await getAuthToken();
      if (!token) throw new Error("No authentication token found");

      if (isOAuth) {
        // Client-side verification for Google OAuth users (no password in DB)
        if (!user || passwordOrEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
          throw new Error("Email address does not match your account email.");
        }
      } else {
        // 1. Verify Password
        const verifyRes = await fetch(`${API_BASE_URL}/auth/verify-password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ password: passwordOrEmail }),
        });

        if (!verifyRes.ok) {
          const errorData = await verifyRes.json().catch(() => ({}));
          throw new Error(errorData.detail || "Invalid password");
        }
      }

      // 2. Attempt to delete from backend (DB)
      // If it exists in DB, backend will also delete it from Supabase storage (if configured)
      
      let backendDeleteSuccess = false;
      const deleteRes = await fetch(`${API_BASE_URL}/documents/${documentToDelete.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (deleteRes.ok) {
        backendDeleteSuccess = true;
      } else if (deleteRes.status !== 404) {
        // If it's 404, it might just be a bucket file without a DB record, which is fine to proceed to bucket delete
        const errorData = await deleteRes.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to delete document from database");
      }

      // 3. Ensure deletion from bucket directly if frontend knows the file path
      // Supabase storage allows anon key deletion if RLS permits, or relies on backend if backend succeeded
      // We attempt to delete it directly from the bucket just in case
      try {
        await deleteFileFromBucket(documentToDelete.name, documentToDelete.bucket);
      } catch (bucketErr) {
        // If backend delete succeeded, maybe backend already deleted it from bucket, so ignore 404/not found errors
        console.warn("Bucket delete response:", bucketErr);
        if (!backendDeleteSuccess) {
           throw bucketErr; // If both DB and bucket delete fail, throw
        }
      }

      toast.success("Document deleted successfully");

      handleCloseModal();
      if (options?.onSuccess) {
        options.onSuccess();
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to delete document");
      if (options?.onError) {
        options.onError(error);
      }
      throw error; // Re-throw to be caught by the modal
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    initiateDelete,
    isDeleting,
    isModalOpen,
    isOAuth,
    handleCloseModal,
    handleConfirmDelete,
  };
}
