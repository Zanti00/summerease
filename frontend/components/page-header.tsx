"use client";

import { useHeader } from "@/lib/contexts/header-context";
import { Button } from "@/components/ui/button";
import { FileUp } from "lucide-react";
import { useEffect } from "react";
import { useFileUpload } from "@/hooks/use-file-upload";

import { getAuthToken } from "@/lib/actions/authActions";
import { API_BASE_URL } from "@/lib/apiConfig";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /**
   * Callback triggered when a document is successfully selected, validated, and uploaded to storage.
   */
  onUploadSuccess?: (file: File, publicUrl?: string) => void | Promise<void>;
  /**
   * Custom label for the upload button. Defaults to "Upload File".
   */
  uploadLabel?: string;
  /**
   * Whether to show the upload button. Defaults to true.
   */
  showUploadButton?: boolean;
}

export function PageHeader({
  title,
  subtitle = "",
  onUploadSuccess,
  uploadLabel = "Upload File",
  showUploadButton = true,
}: PageHeaderProps) {
  const { setTitle, setSubtitle } = useHeader();

  const { triggerUpload, isProcessing } = useFileUpload({
    allowedExtensions: [".docx", ".pdf", ".txt", ".md"],
    allowedMimeTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/pdf",
      "text/plain",
      "text/markdown",
    ],
    onSuccess: async (file) => {
      // 1. Upload to FastAPI
      const formData = new FormData();
      formData.append("file", file);

      try {
        const token = await getAuthToken();
        const res = await fetch(
          `${API_BASE_URL}/documents/upload`,
          {
            method: "POST",
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
            },
            body: formData,
          },
        );

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(
            `Failed to upload document: ${res.status} - ${errText}`,
          );
        }

        const data = JSON.parse((await res.text()) || "{}");

        if (onUploadSuccess) {
          await onUploadSuccess(file, data.file_url);
        }
      } catch (e) {
        console.error(e);
        // Toast is usually handled inside useFileUpload, but here we can just throw or alert
        alert("Failed to upload via API");
      }
    },
    maxSizeMB: 50, // Support larger files up to 50MB
  });

  useEffect(() => {
    setTitle(title);
    setSubtitle(subtitle);

    // No cleanup required here, as the next PageHeader will overwrite it.
  }, [title, subtitle, setTitle, setSubtitle]);

  return (
    <div className="flex flex-col">
      <div className="flex flex-row justify-between items-center">
        <div className="flex flex-col gap-1 pb-4">
          <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </div>
        {showUploadButton && (
          <Button
            variant={"default"}
            onClick={triggerUpload}
            disabled={isProcessing}
          >
            <FileUp className="mr-2 h-4 w-4" />
            {isProcessing ? "Uploading..." : uploadLabel}
          </Button>
        )}
      </div>
      <div className="flex flex-row"></div>
    </div>
  );
}
