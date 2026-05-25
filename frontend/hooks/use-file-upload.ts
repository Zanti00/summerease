import { useState, useCallback } from "react";
import { toast } from "sonner";

/**
 * Configuration options for the file upload/picker hook.
 */
export interface FileUploadOptions {
  /**
   * Allowed file extensions (e.g. [".doc", ".docx"]).
   */
  allowedExtensions?: string[];
  /**
   * Allowed MIME types (e.g. ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]).
   */
  allowedMimeTypes?: string[];
  /**
   * Maximum file size in megabytes (MB).
   */
  maxSizeMB?: number;
  /**
   * If provided, the file will be uploaded automatically to this Supabase bucket.
   */
  supabaseBucket?: string;
  /**
   * Callback triggered when a valid file has been selected (and uploaded if supabaseBucket is defined).
   * Can return a promise if asynchronous operations are performed.
   * 
   * @param file - The validated selected file.
   * @param publicUrl - The public URL of the uploaded file if uploaded to Supabase.
   */
  onSuccess?: (file: File, publicUrl?: string) => void | Promise<void>;
  /**
   * Callback triggered when validation or upload fails.
   * 
   * @param error - The error message.
   */
  onError?: (error: string) => void;
}

/**
 * A reusable hook for picking and validating local files.
 * Handles validation of file extension, MIME type, and file size.
 * Creates an input element programmatically to avoid DOM pollution.
 *
 * @param options - Configuration options for the file upload/picker.
 * @returns An object containing the selected file, error, loading state, trigger function, and clear function.
 */
export function useFileUpload(options: FileUploadOptions = {}) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const triggerUpload = useCallback(() => {
    // Reset any existing error state
    setError(null);

    // Create file input element dynamically
    const input = document.createElement("input");
    input.type = "file";

    // Set accept attribute based on allowed extensions and MIME types
    const acceptParts: string[] = [];
    if (options.allowedExtensions) {
      acceptParts.push(...options.allowedExtensions);
    }
    if (options.allowedMimeTypes) {
      acceptParts.push(...options.allowedMimeTypes);
    }
    if (acceptParts.length > 0) {
      input.accept = acceptParts.join(",");
    }

    input.onchange = async (event: Event) => {
      const target = event.target as HTMLInputElement;
      const selectedFile = target.files?.[0];

      if (!selectedFile) {
        return;
      }

      setIsProcessing(true);

      try {
        // Validate File Extension
        if (options.allowedExtensions && options.allowedExtensions.length > 0) {
          const extension = "." + selectedFile.name.split(".").pop()?.toLowerCase();
          const hasValidExtension = options.allowedExtensions
            .map((ext) => ext.toLowerCase())
            .includes(extension);

          if (!hasValidExtension) {
            const errorMsg = `Invalid file type. Allowed extensions: ${options.allowedExtensions.join(", ")}`;
            setError(errorMsg);
            options.onError?.(errorMsg);
            toast.error(errorMsg);
            setIsProcessing(false);
            return;
          }
        }

        // Validate MIME Type
        if (options.allowedMimeTypes && options.allowedMimeTypes.length > 0) {
          const hasValidMime = options.allowedMimeTypes.includes(selectedFile.type);
          
          // Enforce MIME type validation if the file type is populated.
          // Note: sometimes browsers don't populate MIME type for certain files,
          // so extension check serves as the fallback/primary validation.
          if (selectedFile.type && !hasValidMime) {
            const errorMsg = `Invalid file type. Allowed formats: ${options.allowedMimeTypes.join(", ")}`;
            setError(errorMsg);
            options.onError?.(errorMsg);
            toast.error(errorMsg);
            setIsProcessing(false);
            return;
          }
        }

        // Validate File Size
        if (options.maxSizeMB) {
          const maxSizeBytes = options.maxSizeMB * 1024 * 1024;
          if (selectedFile.size > maxSizeBytes) {
            const errorMsg = `File is too large. Maximum size allowed is ${options.maxSizeMB}MB.`;
            setError(errorMsg);
            options.onError?.(errorMsg);
            toast.error(errorMsg);
            setIsProcessing(false);
            return;
          }
        }

        let publicUrl: string | undefined;

        // Perform automatic upload to Supabase if bucket is specified
        if (options.supabaseBucket) {
          const toastId = toast.loading(`Uploading "${selectedFile.name}" to storage...`);
          try {
            const { uploadToSupabaseBucket } = await import("@/lib/supabase");
            publicUrl = await uploadToSupabaseBucket(selectedFile, options.supabaseBucket);
            toast.success(`Successfully uploaded "${selectedFile.name}"`, { id: toastId });
          } catch (uploadErr) {
            const errorMsg = uploadErr instanceof Error ? uploadErr.message : "Failed to upload file to storage.";
            toast.error(errorMsg, { id: toastId });
            setError(errorMsg);
            options.onError?.(errorMsg);
            setIsProcessing(false);
            return;
          }
        }

        // Selection Successful
        setFile(selectedFile);
        if (options.onSuccess) {
          await options.onSuccess(selectedFile, publicUrl);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "An error occurred during file upload.";
        setError(errorMsg);
        options.onError?.(errorMsg);
        toast.error(errorMsg);
      } finally {
        setIsProcessing(false);
      }
    };

    input.click();
  }, [options]);

  const clear = useCallback(() => {
    setFile(null);
    setError(null);
  }, []);

  return {
    file,
    error,
    isProcessing,
    triggerUpload,
    clear,
  };
}

/**
 * A specialized reusable hook for uploading Word documents (.doc and .docx).
 * Wraps useFileUpload with predefined defaults for Word files.
 *
 * @param options - Configuration options excluding allowedExtensions and allowedMimeTypes.
 * @returns An object containing the selected file, error, loading state, trigger function, and clear function.
 */
export function useWordUpload(
  options: Omit<FileUploadOptions, "allowedExtensions" | "allowedMimeTypes"> = {}
) {
  return useFileUpload({
    ...options,
    allowedExtensions: [".docx"],
    allowedMimeTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  });
}

