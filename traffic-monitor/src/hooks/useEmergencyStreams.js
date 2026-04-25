import { useQuery, useQueryClient } from "@tanstack/react-query";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useEffect, useMemo } from "react";
import { useLiveStreamMetrics, computeDensityPercent, computeSpeedFromDensity } from "./useLiveStreamMetrics";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function useEmergencyStreams() {
    const queryClient = useQueryClient();

    const queryInfo = useQuery({
        queryKey: ["emergency-streams"],
        queryFn: async () => {
            const user = auth.currentUser;
            if (!user) return [];

            const token = await user.getIdToken();

            const res = await fetch(`${API}/api/streams`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const json = await res.json();
            return json.data || [];
        },
        staleTime: Infinity,
    });

    // Real-time Firestore sync
    useEffect(() => {
        const q = query(
            collection(db, "streams"),
            where("status", "==", "active")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const liveStreams = snapshot.docs
                .map((doc) => ({ id: doc.id, ...doc.data() }))
                .filter((s) =>
                    !s.assignedRoles ||
                    s.assignedRoles.length === 0 ||
                    s.assignedRoles.includes("EMERGENCY")
                );

            queryClient.setQueryData(["emergency-streams"], liveStreams);
        });

        return () => unsubscribe();
    }, [queryClient]);

    const streamIds = useMemo(() => queryInfo.data?.map((s) => s.id) || [], [queryInfo.data]);
    const metricsMap = useLiveStreamMetrics(streamIds);

    // Merge live Socket.io metrics into Firestore stream data
    const mergedData = useMemo(() => {
        if (!queryInfo.data) return [];
        return queryInfo.data.map((stream) => {
            const live = metricsMap[stream.id];
            if (!live) return stream;

            const densityPercent = computeDensityPercent(live.count);
            const speed = computeSpeedFromDensity(densityPercent);

            return {
                ...stream,
                metrics: {
                    ...stream.metrics,
                    density: densityPercent / 100,          // keep 0–1 for backward compat
                    densityPercent,
                    speed,
                    count: live.count,
                    status: live.status,
                    updatedAt: live.timestamp,
                },
            };
        });
    }, [queryInfo.data, metricsMap]);

    return { ...queryInfo, data: mergedData };
}

export function useEmergencyActiveStreams() {
    const { data: streams, ...rest } = useEmergencyStreams();

    const emergencyStreams = streams?.filter(stream =>
        stream.currentStatus === 'WARNING' ||
        stream.currentStatus === 'CRITICAL' ||
        stream.status === 'active'
    ) || [];

    return { data: emergencyStreams, ...rest };
}
