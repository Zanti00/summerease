/**
 * Central utility for interacting with Supabase Storage via REST APIs.
 */

/**
 * Uploads a file directly to a Supabase storage bucket using client-side fetch.
 * Generates a unique filename using a random UUID prefix to avoid namespace collisions.
 *
 * @param file - The file to upload.
 * @param bucket - The name of the Supabase storage bucket (defaults to "documents").
 * @returns A promise that resolves to the public URL of the uploaded file.
 * @throws An error if environment variables are missing or if the upload request fails.
 */
export async function uploadToSupabaseBucket(
  file: File,
  bucket = "documents",
): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY) are not configured.",
    );
  }

  // Sanitize the file name to prevent issues with special characters in URLs
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const uniqueId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 15);
  const filePath = `${uniqueId}-${sanitizedName}`;

  const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filePath}`;

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "true",
    },
    body: file,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message ||
        `Supabase storage upload failed with status ${response.status}: ${response.statusText}`,
    );
  }

  // Return the public URL for the newly uploaded file
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
}

/**
 * Interface representing a file object returned from Supabase storage list API.
 */
export interface SupabaseFile {
  name: string;
  id: string;
  created_at: string;
  updated_at: string;
  metadata?: {
    size?: number;
    mimetype?: string;
  };
}

/**
 * Lists all files inside a Supabase storage bucket, sorted by creation date descending.
 *
 * @param bucket - The name of the storage bucket.
 * @returns A promise resolving to an array of SupabaseFile objects.
 */
export async function listFilesInBucket(
  bucket = "documents",
): Promise<SupabaseFile[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY) are not configured.",
    );
  }

  const listUrl = `${supabaseUrl}/storage/v1/object/list/${bucket}`;

  const response = await fetch(listUrl, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prefix: "",
      limit: 100,
      offset: 0,
      sortBy: { column: "created_at", order: "desc" },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message ||
        `Supabase storage list failed with status ${response.status}: ${response.statusText}`,
    );
  }

  return response.json();
}

/**
 * Gets the public URL of a file in the Supabase storage bucket.
 *
 * @param filePath - The path to the file in the bucket.
 * @param bucket - The bucket name.
 * @returns The public URL string.
 */
export function getPublicUrl(filePath: string, bucket = "documents"): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return "";
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
}

/**
 * Deletes a file from a Supabase storage bucket using client-side fetch.
 *
 * @param filePath - The path to the file in the bucket.
 * @param bucket - The name of the storage bucket.
 * @returns A promise that resolves when the file is successfully deleted.
 * @throws An error if the deletion fails.
 */
export async function deleteFileFromBucket(
  filePath: string,
  bucket = "documents",
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY) are not configured.",
    );
  }

  const deleteUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filePath}`;

  const response = await fetch(deleteUrl, {
    method: "DELETE",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message ||
        `Supabase storage delete failed with status ${response.status}: ${response.statusText}`,
    );
  }
}

/**
 * Renames (moves) a file in a Supabase storage bucket using client-side fetch.
 *
 * @param oldFilePath - The current path to the file in the bucket.
 * @param newFilePath - The new path for the file in the bucket.
 * @param bucket - The name of the storage bucket.
 * @returns A promise that resolves when the file is successfully renamed.
 * @throws An error if the renaming fails.
 */
export async function renameFileInBucket(
  oldFilePath: string,
  newFilePath: string,
  bucket = "documents",
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY) are not configured.",
    );
  }

  const moveUrl = `${supabaseUrl}/storage/v1/object/move`;

  const response = await fetch(moveUrl, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bucketId: bucket,
      sourceKey: oldFilePath,
      destinationKey: newFilePath,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message ||
        `Supabase storage rename failed with status ${response.status}: ${response.statusText}`,
    );
  }
}
