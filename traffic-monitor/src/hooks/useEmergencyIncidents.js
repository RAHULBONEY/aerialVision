import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, query, orderBy, getDocs, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function useEmergencyIncidents() {
    const queryClient = useQueryClient();

    const queryInfo = useQuery({
        queryKey: ["emergency-incidents"],
        queryFn: async () => {
            const q = query(collection(db, "incidents"), orderBy("timestamp", "desc"));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        },
    });

    // Real-time updates
    useEffect(() => {
        const q = query(collection(db, "incidents"), orderBy("timestamp", "desc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const incidents = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            queryClient.setQueryData(["emergency-incidents"], incidents);
        });

        return () => unsubscribe();
    }, [queryClient]);

    return queryInfo;
}

// Local acknowledge state management for emergency operators
export function useLocalAcknowledge() {
    const [acknowledged, setAcknowledged] = useState(new Set());

    const acknowledge = (incidentId) => {
        setAcknowledged(prev => new Set([...prev, incidentId]));
    };

    const isAcknowledged = (incidentId) => {
        return acknowledged.has(incidentId);
    };

    return { acknowledge, isAcknowledged, acknowledgedCount: acknowledged.size };
}

// Server-side acknowledge (if the user has permission)
export function useAcknowledgeIncident() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, note }) => {
            const token = await auth.currentUser.getIdToken();

            const res = await fetch(`${API}/api/incidents/${id}/acknowledge`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ note })
            });

            if (!res.ok) throw new Error("Failed to acknowledge incident");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["emergency-incidents"]);
        }
    });
}

// Get incident statistics
export function useIncidentStats() {
    const { data: incidents } = useEmergencyIncidents();

    const stats = {
        total: incidents?.length || 0,
        active: incidents?.filter(i => i.status === 'NEW').length || 0,
        acknowledged: incidents?.filter(i => i.status === 'ACKNOWLEDGED').length || 0,
        resolved: incidents?.filter(i => i.status === 'RESOLVED').length || 0,
        critical: incidents?.filter(i => i.severity === 'CRITICAL').length || 0,
        high: incidents?.filter(i => i.severity === 'HIGH').length || 0,
    };

    return stats;
}
