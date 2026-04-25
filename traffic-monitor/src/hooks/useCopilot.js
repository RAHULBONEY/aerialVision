import { useMutation } from '@tanstack/react-query';
import { auth } from '@/lib/firebase';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getEffectiveHistory(messages, currentQuestion) {
  const history = [];
  for (const msg of messages) {
    if (msg.role === 'user') {
      history.push({ role: 'user', content: msg.content });
    } else if (msg.role === 'copilot') {
      history.push({ role: 'assistant', content: msg.content });
    }
  }
  return history;
}

export function useCopilot() {
  const mutation = useMutation({
    mutationFn: async ({ question, messages }) => {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const token = await user.getIdToken();

      const conversationHistory = getEffectiveHistory(messages, question);

      const res = await fetch(`${API}/api/copilot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ question, conversationHistory })
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || json.error || 'Copilot request failed');
      }

      return json;
    }
  });

  return mutation;
}