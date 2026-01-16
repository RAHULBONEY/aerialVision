// src/hooks/useDashboardQueries.js
import { useQuery } from "@tanstack/react-query";
import { DashboardService } from "@/services/dashboardService";

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ["dashboardStats"],
    queryFn: DashboardService.getStats,
    refetchInterval: 5000, // Auto-refresh every 5 seconds (Live Monitoring)
  });
};

export const useIncidents = () => {
  return useQuery({
    queryKey: ["incidents"],
    queryFn: DashboardService.getIncidents,
  });
};