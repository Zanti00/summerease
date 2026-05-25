"use client";

import { useQuery } from "@tanstack/react-query";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { useParams, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

import { getAuthToken } from "@/lib/actions/authActions";

export default function DocumentEditorPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;

  const { data: document, isLoading, error } = useQuery({
    queryKey: ["document", documentId],
    queryFn: async () => {
      const token = await getAuthToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/documents/${documentId}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : ""
        }
      });
      if (!res.ok) {
        throw new Error("Failed to load document");
      }
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-5xl space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="container mx-auto p-6 max-w-5xl text-center space-y-4">
        <h2 className="text-xl font-semibold text-red-600">Failed to load document</h2>
        <p className="text-slate-500">The document might not exist or you do not have permission.</p>
        <Button onClick={() => router.push("/")} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  // Tiptap can initialize with raw HTML string or a JSON object.
  // If `content` (JSON schema) is null but `content_html` is present (from initial parsing), we pass `content_html`.
  const initialContent = document.content || document.content_html || "";

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            {document.title}
          </h1>
        </div>
      </div>

      <RichTextEditor documentId={documentId} initialContent={initialContent} />
    </div>
  );
}
