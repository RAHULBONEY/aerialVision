import { useState, useCallback } from 'react';
import axios from 'axios';

// API base config assuming typical Vite+Express proxy
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Hook to manage Emergency Routing and Tile Array fetching
 */
export function useEmergencyRoutes() {
  const [session, setSession] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Submit an Origin/Destination request to generate a route and trigger background tile fetching
   */
  const computeRoutes = useCallback(async (origin, destination, options = { samplingIntervalMeters: 30 }) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post(`${API_URL}/api/emergency/routes`, {
        origin,
        destination,
        options
      });

      if (data.success) {
        setSession(data.sessionId);
        setRoutes(data.routes);
        setLoading(false);
        return data; // contains sessionId, routes, and initial known tiles
      } else {
        throw new Error(data.error || 'Failed to compute routes');
      }
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
      setLoading(false);
      return null;
    }
  }, []);

  /**
   * Simple poll for progress
   */
  const pollTileProgress = useCallback(async (sessionId) => {
    try {
      const { data } = await axios.get(`${API_URL}/api/emergency/routes/${sessionId}/tiles`);
      if (data.success) {
        return data;
      }
      return null;
    } catch (err) {
      console.error("Poll failed", err);
      return null;
    }
  }, []);

  /**
   * Trigger AI analysis on downloaded tiles
   */
  const analyzeRoute = useCallback(async (sessionId, tileIds, model = 'mark-5') => {
    try {
      const { data } = await axios.post(`${API_URL}/api/emergency/routes/${sessionId}/analyze`, {
        tileIds,
        model
      });
      if (data.success) {
        return data.analysis;
      }
      return null;
    } catch (err) {
      console.error("Analysis failed", err?.response?.data || err.message);
      return null;
    }
  }, []);

  /**
   * Fetch route history
   */
  const fetchRouteHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${API_URL}/api/emergency/routes/history`);
      if (data.success) {
        setLoading(false);
        return data.history;
      }
      return [];
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
      setLoading(false);
      return [];
    }
  }, []);

  return {
    session,
    routes,
    loading,
    error,
    computeRoutes,
    pollTileProgress,
    analyzeRoute,
    fetchRouteHistory
  };
}

