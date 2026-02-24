import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function useRoles() {
  return useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user) throw new Error("No authenticated user");

      const token = await user.getIdToken();

      const res = await fetch(`${API}/api/admin/roles`, {
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

export function useCreateRole() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      const token = await user.getIdToken();

      const res = await fetch(`${API}/api/admin/roles`, {
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
    onSuccess: () => qc.invalidateQueries(["admin-roles"]),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      const token = await user.getIdToken();

      const res = await fetch(`${API}/api/admin/roles/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries(["admin-roles"]),
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      const token = await user.getIdToken();

      const res = await fetch(`${API}/api/admin/roles/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries(["admin-roles"]),
  });
}
