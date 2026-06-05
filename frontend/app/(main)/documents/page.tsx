"use client";

import { PageHeader } from "@/components/page-header";
import { DocumentGrid } from "@/components/document-grid";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDocuments, useRefreshDocuments } from "@/hooks/use-documents";

interface DbDocument {
  id: string;
  title: string;
  original_file_url?: string;
  created_at?: string;
  updated_at?: string;
}

export default function DocumentPage() {
  const {
    data: documents = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useDocuments();

  const refreshDocuments = useRefreshDocuments();

  return (
    <>
      <PageHeader
        title="Documents"
        subtitle="Manage your files and view recently uploaded documents"
        onUploadSuccess={refreshDocuments}
      />

      <div className="flex flex-col gap-6 py-6">
        <div className="flex items-center justify-between border-b pb-4">
          <h2 className="text-xl font-semibold tracking-tight">
            Your Document Files
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading || isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
            {error instanceof Error
              ? error.message
              : "Failed to load documents"}
          </div>
        )}

        {/* Map DB document objects to match expected props if necessary, or update DocumentCard */}
        <DocumentGrid
          documents={(documents as DbDocument[]).map((d: DbDocument) => ({
            id: d.id,
            name: `${d.id}-${d.title}`,
            created_at: d.created_at || new Date().toISOString(),
            updated_at: d.updated_at || new Date().toISOString(),
            metadata: { size: 0, mimetype: "" },
          }))}
          isLoading={isLoading || isFetching}
          onDeleteSuccess={refreshDocuments}
        />
      </div>
    </>
  );
}
