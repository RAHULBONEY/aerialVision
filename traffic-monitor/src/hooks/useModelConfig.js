
import { useMutation, useQuery,useQueryClient } from "@tanstack/react-query";
import { analyzeSourceUrl, fetchConfigDashboard,updateGovernancePolicy } from "../lib/api/config";
import { auth } from "@/lib/firebase";

export const useAnalyzeSource = () => {
  return useMutation({
    mutationFn: async (data) => {
      
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");
      
      const token = await user.getIdToken(); 

      
      return analyzeSourceUrl({ ...data, token });
    },
    onSuccess: (data) => {
      
    },
    onError: (error) => {
      console.error("❌ Governance Check Failed:", error.message);
    }
  });
};

export const useConfigDashboard = () => {
  return useQuery({
    queryKey: ["modelConfig"],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user) return null;
      const token = await user.getIdToken();
      return fetchConfigDashboard(token);
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpdatePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newPolicy) => {
     

      const user = auth.currentUser;
      const token = await user.getIdToken();

      return updateGovernancePolicy({ ...newPolicy, token });
    },
    onSuccess: (res) => {
      
      queryClient.invalidateQueries(["modelConfig"]);
    }
  });
};
