import { useQuery, useQueryClient } from "@tanstack/react-query";
import { auth, db } from "@/lib/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
import { useEffect } from "react";

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
        const q = query(collection(db, "streams"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const liveStreams = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));

            queryClient.setQueryData(["emergency-streams"], liveStreams);
        });

        return () => unsubscribe();
    }, [queryClient]);

    return queryInfo;
}

// Get streams that have emergency-related signals
export function useEmergencyActiveStreams() {
    const { data: streams, ...rest } = useEmergencyStreams();

    // Filter for streams with warning or critical status
    const emergencyStreams = streams?.filter(stream =>
        stream.currentStatus === 'WARNING' ||
        stream.currentStatus === 'CRITICAL' ||
        stream.status === 'active'
    ) || [];

    return { data: emergencyStreams, ...rest };
}
