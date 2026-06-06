"use client";

import React, { useState, useCallback } from "react";
import { UploadCloud, FileText, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadRAGDocument, RAGDocument } from "@/lib/api/rag";
import { toast } from "sonner";

interface UploadDropzoneProps {
  onUploadSuccess: (doc: RAGDocument) => void;
}

export function UploadDropzone({ onUploadSuccess }: UploadDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  }, []);

  const validateAndUpload = async (file: File) => {
    setError(null);
    const allowedExts = [".pdf", ".docx", ".txt", ".md"];
    const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    
    if (!allowedExts.includes(fileExt)) {
      const err = "Invalid file type. Only PDF, DOCX, TXT, and MD are supported.";
      setError(err);
      toast.error(err);
      return;
    }

    const maxSizeBytes = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSizeBytes) {
      const err = "File is too large. Maximum size is 50MB.";
      setError(err);
      toast.error(err);
      return;
    }

    setIsUploading(true);
    try {
      const doc = await uploadRAGDocument(file);
      toast.success(`"${file.name}" uploaded successfully! Processing started.`);
      onUploadSuccess(doc);
    } catch (err: any) {
      const errMsg = err.message || "Failed to upload document.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndUpload(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndUpload(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all duration-300 ${
          isDragActive
            ? "border-violet-500 bg-violet-500/10 shadow-[0_0_20px_rgba(139,92,246,0.15)]"
            : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
        } min-h-50 text-center overflow-hidden backdrop-blur-md`}
      >
        <input
          type="file"
          id="rag-file-upload"
          className="hidden"
          onChange={handleFileInput}
          disabled={isUploading}
          accept=".pdf,.docx,.txt,.md"
        />

        {isUploading ? (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-10 w-10 text-violet-500 animate-spin" />
            <div>
              <p className="text-slate-200 font-medium text-base">Uploading document...</p>
              <p className="text-slate-500 text-xs mt-1">Please keep this tab open</p>
            </div>
          </div>
        ) : (
          <label
            htmlFor="rag-file-upload"
            className="flex flex-col items-center cursor-pointer space-y-3 w-full"
          >
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-slate-400 group-hover:text-slate-200 transition-colors">
              <UploadCloud className="h-8 w-8 text-violet-400" />
            </div>
            <div>
              <p className="text-slate-200 font-semibold text-base">
                Drag & drop your file here, or <span className="text-violet-400 hover:text-violet-300 underline">browse</span>
              </p>
              <p className="text-slate-500 text-xs mt-1">
                Supports PDF, DOCX, TXT, and MD (Max 50MB)
              </p>
            </div>
          </label>
        )}

        {error && (
          <div className="absolute bottom-4 left-4 right-4 flex items-center space-x-2 text-red-400 bg-red-950/40 border border-red-900/40 rounded-lg p-2.5 text-xs animate-in fade-in slide-in-from-bottom-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
