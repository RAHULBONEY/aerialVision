import { useIncidents } from "@/hooks/useIncidents";
import { usePoliceStreams } from "@/hooks/useStreams";
import { usePatrolUnits } from "@/hooks/usePatrolUnits";
import { useMemo } from "react";

export function useTrafficDashboard() {
  const { data: incidents = [], isLoading: incidentsLoading, error: incidentsError } = useIncidents();
  const { data: streams = [], isLoading: streamsLoading, error: streamsError } = usePoliceStreams();
  const { data: patrolUnits = [], isLoading: patrolUnitsLoading, error: patrolUnitsError } = usePatrolUnits();

  // Combine loading states
  const isLoading = incidentsLoading || streamsLoading || patrolUnitsLoading;
  const isError = incidentsError || streamsError || patrolUnitsError;

  // Process data with useMemo
  const stats = useMemo(() => {
    if (isLoading) return null;

    // --- Incidents Logic ---
    // Only count unresolved/un-acknowledged as 'active' for top level, but it depends on what standard we want.
    // Let's adopt the Emergency Dashboard approach: 'NEW' is active, 'ACKNOWLEDGED' etc.
    // Assuming incidents have a `status` field (e.g., 'NEW', 'ACKNOWLEDGED', 'RESOLVED')
    const activeIncidents = incidents.filter(i => i.status !== 'RESOLVED');

    const incidentsBySeverity = activeIncidents.reduce((acc, curr) => {
      acc[curr.severity] = (acc[curr.severity] || 0) + 1;
      return acc;
    }, { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 });

    // Calculate Average Response Time (for ACKNOWLEDGED incidents)
    let totalResponseTimeMs = 0;
    let acknowledgedCount = 0;

    // We look at all incidents that have been acknowledged to get an average response time.
    // (Assuming incidents have `timestamp` and `acknowledgedAt` fields)
    incidents.forEach(inc => {
      if (inc.status === 'ACKNOWLEDGED' || inc.status === 'RESOLVED') {
        const createdMs = new Date(inc.timestamp).getTime();
        // Fallback to updated at or incident.acknowledgedAt
        const ackMs = inc.acknowledgedAt ? new Date(inc.acknowledgedAt).getTime() : 
                      (inc.updatedAt ? new Date(inc.updatedAt).getTime() : null);
        
        if (createdMs && ackMs && ackMs >= createdMs) {
          totalResponseTimeMs += (ackMs - createdMs);
          acknowledgedCount++;
        }
      }
    });

    // Avg response time in minutes
    const avgResponseTimeMins = acknowledgedCount > 0 
      ? Math.round(totalResponseTimeMs / acknowledgedCount / 60000) 
      : 0;

    // --- Streams Logic ---
    const activeStreams = streams.filter(s => s.status === 'active' || !s.status); // Default to active if status undefined 
    const alertStreams = streams.filter(s => s.currentStatus === 'WARNING' || s.currentStatus === 'CRITICAL');

    // --- Patrol Units Logic ---
    const activePatrolUnits = patrolUnits.filter(u => u.status !== 'OFF_DUTY');
    
    // Detailed unit status breakdown
    const unitsByStatus = patrolUnits.reduce((acc, curr) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, { AVAILABLE: 0, DISPATCHED: 0, EN_ROUTE: 0, ON_SCENE: 0, BUSY: 0 });

    return {
      incidents: {
        total: incidents.length,
        active: activeIncidents.length,
        bySeverity: incidentsBySeverity,
        avgResponseTimeMins,
        recent: incidents.slice(0, 5) // Assuming incidents are pre-sorted by useIncidents DESC
      },
      streams: {
        total: streams.length,
        active: activeStreams.length,
        alertStreams: alertStreams
      },
      patrolUnits: {
        total: patrolUnits.length,
        active: activePatrolUnits.length,
        byStatus: unitsByStatus,
        recent: patrolUnits.slice(0, 5)
      }
    };

  }, [incidents, streams, patrolUnits, isLoading]);

  return {
    stats,
    isLoading,
    isError,
    // Provide raw data as well in case the UI needs it
    incidents,
    streams,
    patrolUnits
  };
}
