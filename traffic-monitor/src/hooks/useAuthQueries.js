// src/hooks/useAuthQueries.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthService } from "@/services/authService";
import { useNavigate } from "react-router-dom";

export const useLoginMutation = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: AuthService.login,
    onSuccess: (data) => {
      // 1. Update React Query cache if you have a 'user' query
      queryClient.setQueryData(["user"], data);
      
      // 2. Redirect to Dashboard
      navigate("/dashboard");
    },
    onError: (error) => {
      console.error("Login Failed:", error.message);
    }
  });
};

export const useSeedAdminMutation = () => {
    return useMutation({
        mutationFn: ({email, password}) => AuthService.seedAdmin(email, password)
    });
};