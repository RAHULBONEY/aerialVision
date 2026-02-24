import { useQuery } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function useAuditLogs(filters = {}) {
  return useQuery({
    queryKey: ["admin-audit-logs", filters],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user) throw new Error("No authenticated user");

      const token = await user.getIdToken();

      const queryParams = new URLSearchParams();
      if (filters.limit) queryParams.append("limit", filters.limit);
      if (filters.cursor) queryParams.append("cursor", filters.cursor);
      if (filters.category && filters.category !== "ALL") queryParams.append("category", filters.category);
      if (filters.action) queryParams.append("action", filters.action);
      if (filters.performedByUid) queryParams.append("performedByUid", filters.performedByUid);

      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

      const res = await fetch(`${API}/api/admin/audit-logs${queryString}`, {
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
      return json; // returns { data, nextCursor, hasMore }
    },
    keepPreviousData: true,
  });
}
