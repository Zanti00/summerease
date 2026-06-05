"use client";

import React from "react";
import { useDeleteDocument } from "@/hooks/use-delete-document";
import { VerifyPasswordModal } from "@/components/ui/verify-password-modal";

interface DeleteDocumentTriggerProps {
  documentId: string;
  documentName: string;
  bucketName?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  children: (props: { onClick: (e: React.MouseEvent) => void; isDeleting: boolean }) => React.ReactNode;
}

/**
 * Reusable wrapper component that encapsulates the deletion logic
 * including the verification modal flow.
 */
export function DeleteDocumentTrigger({
  documentId,
  documentName,
  bucketName = "documents",
  onSuccess,
  onError,
  children,
}: DeleteDocumentTriggerProps) {
  const {
    initiateDelete,
    isDeleting,
    isModalOpen,
    isOAuth,
    handleCloseModal,
    handleConfirmDelete,
  } = useDeleteDocument({
    onSuccess,
    onError,
  });

  const displayName = documentName.replace(/^[a-f0-9-]{36}-/, "");

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    initiateDelete(documentId, documentName, bucketName);
  };

  return (
    <>
      {children({ onClick: handleClick, isDeleting })}
      <div onClick={(e) => e.stopPropagation()}>
        <VerifyPasswordModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onConfirm={handleConfirmDelete}
          isLoading={isDeleting}
          isOAuth={isOAuth}
          title="Delete Document"
          description={`Are you sure you want to delete "${displayName}"? This action cannot be undone.`}
        />
      </div>
    </>
  );
}
