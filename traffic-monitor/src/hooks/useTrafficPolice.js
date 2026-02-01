import { useQuery } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * Fetch all active traffic police officers (excluding current user)
 */
export function useTrafficPolice() {
  return useQuery({
    queryKey: ["traffic-police"],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      const token = await user.getIdToken();
      const res = await fetch(`${API}/api/traffic-police`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch traffic police directory");
      }

      const json = await res.json();
      return json.data;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}
