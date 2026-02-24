import { useQuery } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function useLoginHistory(filters = {}) {
  return useQuery({
    queryKey: ["admin-login-history", filters],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user) throw new Error("No authenticated user");

      const token = await user.getIdToken();

      const queryParams = new URLSearchParams();
      if (filters.limit) queryParams.append("limit", filters.limit);
      if (filters.cursor) queryParams.append("cursor", filters.cursor);
      if (filters.role && filters.role !== "ALL") queryParams.append("role", filters.role);
      if (filters.status && filters.status !== "ALL") queryParams.append("status", filters.status);
      if (filters.uid) queryParams.append("uid", filters.uid);

      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

      const res = await fetch(`${API}/api/admin/login-history${queryString}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      const json = await res.json();
      return json; // { data, nextCursor, hasMore }
    },
    keepPreviousData: true,
  });
}
