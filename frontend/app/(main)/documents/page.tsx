"use client";

import { PageHeader } from "@/components/page-header";
import { DocumentGrid } from "@/components/document-grid";
import { RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDocuments, useRefreshDocuments } from "@/hooks/use-documents";
import { useMemo, useState } from "react";

interface DbDocument {
  id: string;
  title: string;
  original_file_url?: string;
  file_size?: number;
  file_type?: string;
  created_at?: string;
  updated_at?: string;
}

export default function DocumentPage() {
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const {
    data = {
      documents: [],
      pagination: {
        page: 1,
        per_page: pageSize,
        total: 0,
        total_pages: 0,
      },
    },
    isLoading,
    isFetching,
    error,
    refetch,
  } = useDocuments(page, pageSize);

  const refreshDocuments = useRefreshDocuments();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDocuments = useMemo(() => {
    const documents = Array.isArray(data?.documents)
      ? (data.documents as DbDocument[])
      : [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return documents;
    }

    return documents.filter((document) => {
      return [`${document.title ?? ""}`, document.id]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [data.documents, searchQuery]);

  const documentFiles = useMemo(
    () =>
      filteredDocuments.map((document) => ({
        id: document.id,
        name: `${document.id}-${document.title}`,
        created_at: document.created_at || new Date().toISOString(),
        updated_at: document.updated_at || new Date().toISOString(),
        metadata: {
          size: document.file_size,
          mimetype: document.file_type,
        },
      })),
    [filteredDocuments],
  );

  const pagination = data?.pagination ?? {
    page: 1,
    per_page: pageSize,
    total: 0,
    total_pages: 0,
  };
  const canPrevious = page > 1;
  const canNext = page < pagination.total_pages;

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
          <div className="flex items-center gap-2">
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
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search documents"
                className="h-10 rounded-md border border-input bg-background px-10 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
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
          documents={documentFiles}
          isLoading={isLoading || isFetching}
          emptyStateMessage={
            searchQuery.trim() ? "No documents match your search" : undefined
          }
          emptyStateDescription={
            searchQuery.trim()
              ? "Try searching by title or document ID."
              : undefined
          }
          onDeleteSuccess={refreshDocuments}
        />

        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card/80 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            Page {pagination.page} of {pagination.total_pages || 1}
            <span className="text-muted-foreground/80">
              {" "}
              • {pagination.total} total documents
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={!canPrevious || isLoading || isFetching}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPage((current) =>
                  Math.min(pagination.total_pages || 1, current + 1),
                )
              }
              disabled={!canNext || isLoading || isFetching}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
