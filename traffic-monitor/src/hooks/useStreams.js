import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auth,db } from "@/lib/firebase";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { useEffect } from "react";
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
export function usePoliceStreams() {
  const queryClient = useQueryClient();

 
  const queryInfo = useQuery({
    queryKey: ["police-streams"],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user) return [];
      
      const token = await user.getIdToken();
      
      const res = await fetch(`${API}/api/streams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const json = await res.json();
      return json.data;
    },
    staleTime: Infinity, 
  });

  
  useEffect(() => {
    // Query only streams where TRAFFIC_POLICE is in assignedRoles
    const q = query(
      collection(db, "streams"),
      where("assignedRoles", "array-contains", "TRAFFIC_POLICE")
    ); 
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveStreams = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      
      queryClient.setQueryData(["police-streams"], liveStreams);
    });

    return () => unsubscribe();
  }, [queryClient]);

  return queryInfo;
}