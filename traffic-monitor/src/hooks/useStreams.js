import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

import { useState } from "react";



export function useStreams() {
  return useQuery({
    queryKey: ["streams"],
    queryFn: async () => {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API}/api/admin/streams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json.data;
    },
  });
}

export function useStopStream() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const token = await auth.currentUser.getIdToken();
      await fetch(`${API}/api/admin/streams/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => qc.invalidateQueries(["streams"]),
  });
}

export function useCreateStream() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API}/api/admin/streams`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries(["streams"]),
  });
}
export function useToggleStream() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }) => {
      const token = await auth.currentUser.getIdToken();
      await fetch(`${API}/api/admin/streams/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: status === "active" ? "inactive" : "active",
        }),
      });
    },
    onSuccess: () => qc.invalidateQueries(["streams"]),
  });
}
