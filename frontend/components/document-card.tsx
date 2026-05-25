import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { FileText, Download, Calendar } from "lucide-react";
import { getPublicUrl, type SupabaseFile } from "@/lib/supabase";
import { formatBytes, formatDate, cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useDeleteDocument } from "@/hooks/use-delete-document";
import { VerifyPasswordModal } from "@/components/ui/verify-password-modal";
import { Trash2 } from "lucide-react";

/**
 * Props for the DocumentCard component.
 */
interface DocumentCardProps {
  /**
   * The file metadata from Supabase Storage.
   */
  document: SupabaseFile;
  /**
   * The Supabase Storage bucket name (defaults to "documents").
   */
  bucketName?: string;
  /**
   * Callback fired when the document is successfully deleted.
   */
  onDeleteSuccess?: () => void;
}

/**
 * Reusable DocumentCard component.
 * Displays file information in a formatted, premium card including:
 * - A Word file icon.
 * - Sanitized display name (strips UUID prefix).
 * - Upload date and formatted file size.
 * - A direct download button linking to the file's public storage URL.
 */
export function DocumentCard({
  document,
  bucketName = "documents",
  onDeleteSuccess,
}: DocumentCardProps) {
  const router = useRouter();
  const publicUrl = getPublicUrl(document.name, bucketName);
  
  // document.name might be uuid-filename or just filename. Since our new flow uses DB documents, we should probably change this later to support the DB document type.
  // For now, extract the uuid part if it exists (assuming it starts with UUID).
  const docIdMatch = document.name.match(/^[a-f0-9-]{36}/);
  const docId = docIdMatch ? docIdMatch[0] : document.id; // Fallback to document.id if it's from DB

  const displayName = document.name.replace(/^[a-f0-9-]{36}-/, "");

  const {
    initiateDelete,
    isDeleting,
    isModalOpen,
    handleCloseModal,
    handleConfirmDelete,
  } = useDeleteDocument({
    onSuccess: onDeleteSuccess,
  });

  return (
    <>
      <Card 
        onClick={() => router.push(`/documents/${docId}`)}
        className="group hover:cursor-pointer relative overflow-hidden transition-all duration-300 hover:shadow-md hover:border-primary/30 bg-white"
      >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="rounded-lg bg-slate-100 p-2.5 text-slate-600 transition-transform duration-300">
            <FileText className="h-6 w-6" />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              initiateDelete(docId, document.name, bucketName);
            }}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
            title="Delete Document"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <CardTitle
          className="line-clamp-2 text-sm font-semibold tracking-tight text-slate-800 transition-colors duration-200"
          title={displayName}
        >
          {displayName}
        </CardTitle>
        <div className="mt-3 flex flex-col gap-1.5 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(document.created_at)}</span>
          </div>
          <div>
            <span>{formatBytes(document.metadata?.size)}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "w-full justify-start text-slate-600 hover:text-primary hover:bg-slate-50 gap-2",
          )}
        >
          <Download className="h-4 w-4" />
          Download File
        </a>
      </CardFooter>
      </Card>
      
      <VerifyPasswordModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title="Delete Document"
        description={`Are you sure you want to delete "${displayName}"? This action cannot be undone.`}
      />
    </>
  );
}
