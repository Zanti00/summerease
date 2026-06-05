"use client";

import { PageHeader } from "@/components/page-header";
import { DocumentGrid } from "@/components/document-grid";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getAuthToken } from "@/lib/actions/authActions";

/**
 * Documents page component.
 * Displays all files uploaded to the 'documents' storage bucket in a grid container.
 * Uses the reusable DocumentGrid component to handle loading, empty, and file card listing views.
 */
export default function DocumentPage() {
  const queryClient = useQueryClient();

  const {
    data: documents = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const token = await getAuthToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/documents`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        },
      );
      if (!res.ok) {
        throw new Error("Failed to load documents");
      }
      return res.json();
    },
    gcTime: 0,
  });

  const handleUploadSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["documents"] });
  };

  const handleDeleteSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["documents"] });
  };

  return (
    <>
      <PageHeader
        title="Documents"
        subtitle="Manage your files and view recently uploaded documents"
        onUploadSuccess={handleUploadSuccess}
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
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
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
          documents={documents.map((d: any) => ({
            ...d,
            name: `${d.id}-${d.title}`, // simulate storage filename format for DocumentCard compatibility if needed, though we updated DocumentCard to use document.id as fallback
            metadata: { size: 0 }, // fake size
          }))}
          isLoading={isLoading}
          onDeleteSuccess={handleDeleteSuccess}
        />
      </div>
    </>
  );
}
