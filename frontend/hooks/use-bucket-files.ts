import { useState, useEffect, useCallback } from "react";
import { listFilesInBucket, type SupabaseFile } from "@/lib/supabase";

/**
 * A reusable hook to fetch and manage the list of files in a Supabase Storage bucket.
 * Handles loading states, error states, and exposes a manual refresh function.
 *
 * @param bucketName - The name of the Supabase storage bucket (defaults to "documents").
 * @returns An object containing files, loading state, error state, and refresh function.
 */
export function useBucketFiles(bucketName = "documents") {
  const [files, setFiles] = useState<SupabaseFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    await Promise.resolve();
    setIsLoading(true);
    setError(null);
    try {
      const result = await listFilesInBucket(bucketName);
      setFiles(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setIsLoading(true); // Wait, should this be false? Yes, loading is finished!
      setIsLoading(false);
    }
  }, [bucketName]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFiles();
  }, [fetchFiles]);

  return {
    files,
    isLoading,
    error,
    refresh: fetchFiles,
  };
}
