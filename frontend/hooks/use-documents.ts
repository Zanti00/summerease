import { useQuery } from "@tanstack/react-query";
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
    gcTime: 0, // Prevent caching stale data
  });
};
