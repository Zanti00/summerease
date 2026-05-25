import { FileText, Loader2 } from "lucide-react";
import { type SupabaseFile } from "@/lib/supabase";
import { DocumentCard } from "./document-card";

/**
 * Props for the DocumentGrid component.
 */
interface DocumentGridProps {
  /**
   * List of files to display in the grid.
   */
  documents: SupabaseFile[];
  /**
   * If true, displays a loading indicator.
   */
  isLoading: boolean;
  /**
   * The Supabase Storage bucket name (defaults to "documents").
   */
  bucketName?: string;
  /**
   * Optional custom loading state message text.
   */
  loadingMessage?: string;
  /**
   * Optional custom empty state message header.
   */
  emptyStateMessage?: string;
  /**
   * Optional custom empty state explanation subtext.
   */
  emptyStateDescription?: string;
  /**
   * Callback fired when a document is successfully deleted.
   */
  onDeleteSuccess?: () => void;
}

/**
 * Reusable DocumentGrid component.
 * Renders the overall states (loading, empty, or a responsive grid container of DocumentCards).
 */
export function DocumentGrid({
  documents,
  isLoading,
  bucketName = "documents",
  loadingMessage = "Loading documents from storage...",
  emptyStateMessage = "No documents found",
  emptyStateDescription = "Click the upload button in the header to add Word files.",
  onDeleteSuccess,
}: DocumentGridProps) {
  if (isLoading && documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p>{loadingMessage}</p>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-20 text-muted-foreground gap-4 bg-muted/10">
        <FileText className="h-12 w-12 text-muted-foreground/50" />
        <div className="text-center">
          <p className="font-semibold text-lg">{emptyStateMessage}</p>
          <p className="text-sm text-muted-foreground">{emptyStateDescription}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {documents.map((doc) => (
        <DocumentCard 
          key={doc.id} 
          document={doc} 
          bucketName={bucketName} 
          onDeleteSuccess={onDeleteSuccess}
        />
      ))}
    </div>
  );
}
