import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAuthToken } from "@/lib/actions/authActions";
import { API_BASE_URL } from "@/lib/apiConfig";

export interface DocumentPagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface DocumentListResponse {
  documents: any[];
  pagination: DocumentPagination;
}

export const fetchDocuments = async (page = 1, perPage = 8) => {
  const token = await getAuthToken();
  const queryParams = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });

  const res = await fetch(
    `${API_BASE_URL}/documents?${queryParams.toString()}`,
    {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
    },
  );
  if (!res.ok) {
    throw new Error("Failed to load documents");
  }
  return res.json() as Promise<DocumentListResponse>;
};

export const useDocuments = (page: number, perPage = 8) => {
  return useQuery<DocumentListResponse>({
    queryKey: ["documents", page],
    queryFn: () => fetchDocuments(page, perPage),
    gcTime: 0, // Prevent caching stale data when component is completely unmounted for long
    refetchOnWindowFocus: false, // Disable refetch on browser tab focus
    refetchOnReconnect: false, // Disable refetch on internet reconnect
    staleTime: 5 * 60 * 1000, // Keep data fresh for 5 minutes to prevent automatic refetches on mount/page switch
  });
};

export const useRefreshDocuments = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["documents"] });
  };
};
