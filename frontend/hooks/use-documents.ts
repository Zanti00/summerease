import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAuthToken } from "@/lib/actions/authActions";

export const fetchDocuments = async () => {
  const token = await getAuthToken();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/documents`, {
    headers: {
      Authorization: token ? `Bearer ${token}` : ""
    }
  });
  if (!res.ok) {
    throw new Error("Failed to load documents");
  }
  return res.json();
};

export const useDocuments = () => {
  return useQuery({
    queryKey: ["documents"],
    queryFn: fetchDocuments,
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

