import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const fetchOperators = async () => {
  const res = await fetch(`${API}/api/admin/operators`, {
    credentials: "include",
    
  });
  if (!res.ok) throw new Error("Failed to fetch operators");
  return res.json();
};

export function useOperators() {
  return useQuery({
    queryKey: ["admin-operators"],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user) throw new Error("No authenticated user");

      const token = await user.getIdToken();

      const res = await fetch(`${API}/api/admin/operators`, {
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
      

      return json.data; 
    },
  });
}


export function useCreateOperator() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      const token = await user.getIdToken();

      const res = await fetch(`${API}/api/admin/operators`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },

    onMutate: async (newOperator) => {
      await qc.cancelQueries({ queryKey: ["admin-operators"] });

      const previous = qc.getQueryData(["admin-operators"]);

      qc.setQueryData(["admin-operators"], (old) => {
        const list = Array.isArray(old) ? old : [];
        return [
          {
            uid: `temp-${Date.now()}`,
            ...newOperator,
            status: "ACTIVE",
            createdAt: { _seconds: Math.floor(Date.now() / 1000) },
          },
          ...list,
        ];
      });

      return { previous };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(["admin-operators"], ctx.previous);
      }
    },

    onSuccess: (res) => {
      qc.setQueryData(["admin-operators"], (old = []) =>
        old.map((op) => (op.uid.startsWith("temp-") ? res.data : op))
      );
    },
  });
}



export function useUpdateStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ uid, status }) => {
      await fetch(`${API}/api/admin/operators/${uid}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => qc.invalidateQueries(["operators"]),
  });
}
