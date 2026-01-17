import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

import { useState } from "react";



export function useStreams() {
    const [streams, setStreams] = useState([]);

    const createStream = (stream) => {
        setStreams((prev) => [stream, ...prev]);
    };

    const stopStream = async (streamId) => {
        await fetch(`http://localhost:8001/streams/${streamId}/stop`, {
            method: "POST",
        });

        setStreams((prev) => prev.filter((s) => s.id !== streamId));
    };

    return {
        data: streams,
        createStream,
        stopStream,
    };
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
