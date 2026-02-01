import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

//fetch chats for users
export function useChats() {
  return useQuery({
    queryKey: ["chats"],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      const token = await user.getIdToken();
      const res = await fetch(`${API}/api/chats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch chats");
      }

      const json = await res.json();
      return json.data;
    },
    staleTime: 10 * 1000, 
  });
}

//specif chat
export function useChat(chatId) {
  return useQuery({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      if (!chatId) return null;

      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      const token = await user.getIdToken();
      const res = await fetch(`${API}/api/chats/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch chat");
      }

      const json = await res.json();
      return json.data;
    },
    enabled: !!chatId,
  });
}


export function useCreateChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (participantId) => {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      const token = await user.getIdToken();
      const res = await fetch(`${API}/api/chats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ participantId }),
      });

      if (!res.ok) {
        throw new Error("Failed to create chat");
      }

      const json = await res.json();
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
}
