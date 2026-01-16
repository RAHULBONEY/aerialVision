// src/hooks/useHospitalQueries.js
import { useQuery } from "@tanstack/react-query";
import { HospitalService } from "@/services/hospitalService";

export const useHospitalStats = () => useQuery({ 
    queryKey: ["hospitalStats"], 
    queryFn: HospitalService.getStats,
    refetchInterval: 10000 
});

export const useAmbulanceFeed = () => useQuery({ 
    queryKey: ["ambulanceFeed"], 
    queryFn: HospitalService.getActiveAmbulances,
    refetchInterval: 3000 // Real-time updates are critical here
});