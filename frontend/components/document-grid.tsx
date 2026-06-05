import { FileText } from "lucide-react";
import { type SupabaseFile } from "@/lib/supabase";
import { DocumentCard } from "./document-card";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DocumentCardSkeleton() {
  return (
    <Card className="overflow-hidden transition-all bg-secondary/20 border-border animate-pulse">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-11 w-11 rounded-lg bg-muted" />
          <Skeleton className="h-8 w-8 rounded-md bg-muted" />
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4 rounded bg-muted" />
          <Skeleton className="h-4 w-1/2 rounded bg-muted" />
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-3.5 w-3.5 rounded-full bg-muted" />
            <Skeleton className="h-3 w-1/3 rounded bg-muted" />
          </div>
          <Skeleton className="h-3 w-1/4 rounded bg-muted" />
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Skeleton className="h-8 w-full rounded-md bg-muted" />
      </CardFooter>
    </Card>
  );
}

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
  emptyStateMessage = "No documents found",
  emptyStateDescription = "Click the upload button in the header to add Word files.",
  onDeleteSuccess,
}: DocumentGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <DocumentCardSkeleton key={i} />
        ))}
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
