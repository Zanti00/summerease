"use client";

import React, { useState } from "react";
import { useRenameDocument } from "@/hooks/use-rename-document";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RenameDocumentTriggerProps {
  documentId: string;
  documentName: string;
  bucketName?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  children: (props: { onClick: (e: React.MouseEvent) => void; isRenaming: boolean }) => React.ReactNode;
}

export function RenameDocumentTrigger({
  documentId,
  documentName,
  bucketName = "documents",
  onSuccess,
  onError,
  children,
}: RenameDocumentTriggerProps) {
  const {
    initiateRename,
    isRenaming,
    isModalOpen,
    handleCloseModal,
    handleConfirmRename,
  } = useRenameDocument({
    onSuccess,
    onError,
  });

  const [newName, setNewName] = useState("");

  const displayName = documentName.replace(/^[a-f0-9-]{36}-/, "");

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNewName(displayName);
    initiateRename(documentId, documentName, bucketName);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newName.trim() === displayName) {
      handleCloseModal();
      return;
    }
    handleConfirmRename(newName.trim());
  };

  return (
    <>
      {children({ onClick: handleClick, isRenaming })}
      {isModalOpen && (
        <div onClick={(e) => e.stopPropagation()}>
          <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rename Document</DialogTitle>
                <DialogDescription>
                  Enter a new name for the document.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={onSubmit}>
                <div className="grid gap-4 py-4">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    autoFocus
                    placeholder="New document name"
                    disabled={isRenaming}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseModal} disabled={isRenaming}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isRenaming || !newName.trim() || newName.trim() === displayName}>
                    {isRenaming ? "Renaming..." : "Rename"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </>
  );
}
