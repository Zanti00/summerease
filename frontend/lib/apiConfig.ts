/**
 * Central configuration for API versioning and base URLs.
 */

const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// API Versioning Configuration
export const API_VERSION = "v1";
export const API_BASE_URL = `${NEXT_PUBLIC_API_URL}/api/${API_VERSION}`;

// Helper for building API endpoints
export const getApiUrl = (path: string) => {
  // Ensure path doesn't start with / to avoid double slashes
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${API_BASE_URL}/${cleanPath}`;
};

export default {
  API_BASE_URL,
  API_VERSION,
  getApiUrl,
};
