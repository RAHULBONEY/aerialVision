import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const QUERY_KEY = "patrolUnits";
const POLL_INTERVAL = 5000; // 5 seconds for near real-time feel

// Helper function for authenticated fetch
async function authFetch(url, options = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const token = await user.getIdToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `Request failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Fetch all patrol units
 */
export function usePatrolUnits(options = {}) {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const json = await authFetch(`${API}/api/traffic-police/patrol-units`);
      return json.data;
    },
    refetchInterval: options.polling !== false ? POLL_INTERVAL : false,
    staleTime: 3000,
    ...options,
  });
}

/**
 * Fetch a single patrol unit by ID
 */
export function usePatrolUnit(unitId, options = {}) {
  return useQuery({
    queryKey: [QUERY_KEY, unitId],
    queryFn: async () => {
      const json = await authFetch(`${API}/api/traffic-police/patrol-units/${unitId}`);
      return json.data;
    },
    enabled: !!unitId,
    ...options,
  });
}

/**
 * Create a new patrol unit
 */
export function useCreatePatrolUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const json = await authFetch(`${API}/api/traffic-police/patrol-units`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

/**
 * Update patrol unit location
 */
export function useUpdateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ unitId, location }) => {
      const json = await authFetch(
        `${API}/api/traffic-police/patrol-units/${unitId}/location`,
        {
          method: "PATCH",
          body: JSON.stringify({ location }),
        }
      );
      return json.data;
    },
    onMutate: async ({ unitId, location }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY] });
      const previousUnits = queryClient.getQueryData([QUERY_KEY]);

      queryClient.setQueryData([QUERY_KEY], (old) =>
        old?.map((unit) =>
          unit.id === unitId
            ? { ...unit, location, lastUpdated: new Date().toISOString() }
            : unit
        )
      );

      return { previousUnits };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData([QUERY_KEY], context.previousUnits);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

/**
 * Update patrol unit status
 */
export function useUpdateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ unitId, status }) => {
      const json = await authFetch(
        `${API}/api/traffic-police/patrol-units/${unitId}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }
      );
      return json.data;
    },
    onMutate: async ({ unitId, status }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY] });
      const previousUnits = queryClient.getQueryData([QUERY_KEY]);

      queryClient.setQueryData([QUERY_KEY], (old) =>
        old?.map((unit) =>
          unit.id === unitId
            ? { ...unit, status, lastUpdated: new Date().toISOString() }
            : unit
        )
      );

      return { previousUnits };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData([QUERY_KEY], context.previousUnits);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

/**
 * Dispatch patrol unit to an incident
 */
export function useDispatchUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ unitId, incidentId }) => {
      const json = await authFetch(
        `${API}/api/traffic-police/patrol-units/${unitId}/dispatch`,
        {
          method: "PATCH",
          body: JSON.stringify({ incidentId }),
        }
      );
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

/**
 * Delete a patrol unit
 */
export function useDeletePatrolUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (unitId) => {
      await authFetch(`${API}/api/traffic-police/patrol-units/${unitId}`, {
        method: "DELETE",
      });
      return unitId;
    },
    onMutate: async (unitId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY] });
      const previousUnits = queryClient.getQueryData([QUERY_KEY]);

      queryClient.setQueryData([QUERY_KEY], (old) =>
        old?.filter((unit) => unit.id !== unitId)
      );

      return { previousUnits };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData([QUERY_KEY], context.previousUnits);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
