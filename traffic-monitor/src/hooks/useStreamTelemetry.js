import { useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from './useSocket';

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:8001';

export function useStreamTelemetry(stream) {
  const isSimulation = stream?.type === 'SIMULATION';
  const streamId = stream?.id || null;

  const socketData = useSocket(isSimulation ? null : streamId);

  const [ndjsonState, setNdjsonState] = useState({
    stats: { count: 0, status: 'IDLE', density: 0, green_wave: false },
    boxes: [],
    incidents: [],
    connectionStatus: 'idle',
    error: null,
  });

  const abortRef = useRef(null);
  const throttleRef = useRef({ pending: null, raf: null });

  const flush = useCallback(() => {
    if (throttleRef.current.pending) {
      const p = throttleRef.current.pending;
      setNdjsonState((prev) => {
        const incoming = p.newIncidents || [];
        const merged = [...incoming, ...prev.incidents].slice(0, 15);
        return {
          ...prev,
          stats: p.newStats || prev.stats,
          boxes: p.newBoxes || prev.boxes,
          incidents: merged,
          connectionStatus: 'connected',
        };
      });
      throttleRef.current.pending = null;
    }
    throttleRef.current.raf = null;
  }, []);

  const scheduleFlush = useCallback(() => {
    if (!throttleRef.current.raf) {
      throttleRef.current.raf = requestAnimationFrame(flush);
    }
  }, [flush]);

  useEffect(() => {
    if (!isSimulation || !stream?.simulationId) return;

    let cancelled = false;

    const run = async () => {
      setNdjsonState((prev) => ({
        ...prev,
        connectionStatus: 'connecting',
        error: null,
        incidents: [],
      }));

      try {
        const formData = new FormData();
        formData.append('simulation_id', stream.simulationId);
        formData.append('model', stream.model || 'mark-5');

        const abort = new AbortController();
        abortRef.current = abort;

        const res = await fetch(`${GATEWAY_URL}/process-simulation`, {
          method: 'POST',
          body: formData,
          signal: abort.signal,
        });

        if (cancelled) return;
        if (!res.ok) throw new Error(`Gateway error ${res.status}`);
        if (!res.body) throw new Error('No response body');

        setNdjsonState((prev) => ({ ...prev, connectionStatus: 'connected' }));

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const packet = JSON.parse(line);
              const newStats = {
                count: packet.stats?.count ?? 0,
                status: packet.stats?.status || 'IDLE',
                density: packet.stats?.density ?? 0,
                green_wave: packet.stats?.green_wave ?? false,
              };
              const newBoxes = (packet.boxes || []).map((b) => ({
                x1: b.x1,
                y1: b.y1,
                x2: b.x2,
                y2: b.y2,
                label: b.class || '',
                confidence: b.conf ?? 0,
              }));
              const newIncidents = packet.incidents || [];

              throttleRef.current.pending = { newStats, newBoxes, newIncidents };
              scheduleFlush();
            } catch (e) {
              console.warn('Malformed NDJSON line:', e);
            }
          }
        }

        if (!cancelled)
          setNdjsonState((prev) => ({ ...prev, connectionStatus: 'idle' }));
      } catch (err) {
        if (!cancelled && err.name !== 'AbortError') {
          setNdjsonState((prev) => ({
            ...prev,
            connectionStatus: 'error',
            error: err.message,
          }));
        }
      }
    };

    run();

    return () => {
      cancelled = true;
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      if (throttleRef.current.raf) {
        cancelAnimationFrame(throttleRef.current.raf);
        throttleRef.current.raf = null;
      }
    };
  }, [isSimulation, stream?.simulationId, stream?.model, scheduleFlush]);

  if (isSimulation) {
    return {
      stats: ndjsonState.stats,
      boxes: ndjsonState.boxes,
      incidents: ndjsonState.incidents,
      connectionStatus: ndjsonState.connectionStatus,
      error: ndjsonState.error,
      isLoading: ndjsonState.connectionStatus === 'connecting',
      greenWaveActive: ndjsonState.stats.green_wave,
    };
  }

  return {
    stats: socketData.stats || {
      count: 0,
      status: 'IDLE',
      density: 0,
      green_wave: false,
    },
    boxes: socketData.latestFrame?.boxes || [],
    incidents: socketData.incidents?.slice(0, 15) || [],
    connectionStatus: socketData.isConnected
      ? 'connected'
      : socketData.connectionError
        ? 'error'
        : 'connecting',
    error: socketData.connectionError,
    isLoading: !socketData.isConnected && !socketData.connectionError,
    greenWaveActive: socketData.greenWaveActive,
  };
}
