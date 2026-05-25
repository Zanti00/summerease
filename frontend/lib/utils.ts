import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats file size in bytes to a human-readable string.
 * 
 * @param bytes - Size in bytes.
 * @returns Formatted size string.
 */
export function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === null) return "Unknown size";
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Formats ISO date string to a localized date.
 * 
 * @param dateString - The ISO date string.
 * @returns Localized date string.
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Unknown date";
  }
}

