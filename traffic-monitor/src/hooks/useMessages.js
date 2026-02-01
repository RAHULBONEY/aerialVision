import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * Fetch messages for a chat with polling
 */
export function useMessages(chatId) {
  return useQuery({
    queryKey: ["messages", chatId],
    queryFn: async () => {
      if (!chatId) return [];

      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      const token = await user.getIdToken();
      const res = await fetch(`${API}/api/chats/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch messages");
      }

      const json = await res.json();
      return json.data;
    },
    enabled: !!chatId,
    refetchInterval: 3000, // Poll every 3 seconds for new messages
    staleTime: 1000,
  });
}

/**
 * Send a message to a chat
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ chatId, text }) => {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      const token = await user.getIdToken();
      const res = await fetch(`${API}/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        throw new Error("Failed to send message");
      }

      const json = await res.json();
      return json.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate messages to refetch
      queryClient.invalidateQueries({ queryKey: ["messages", variables.chatId] });
      // Also invalidate chats to update lastMessage preview
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
}
