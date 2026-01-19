import { useQuery,useMutation } from "@tanstack/react-query";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useIncidents() {
  return useQuery({
    queryKey: ["incidents"],
    queryFn: async () => {
     
      const q = query(collection(db, "incidents"), orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    
  });
}
export function useAcknowledgeIncident() {
  return useMutation({
    mutationFn: async ({ id, note }) => {
      const token = await auth.currentUser.getIdToken();
      
      const res = await fetch(`${API}/api/incidents/${id}/acknowledge`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ note })
      });

      if (!res.ok) throw new Error("Failed to acknowledge incident");
      return res.json();
    },
    
  });
}