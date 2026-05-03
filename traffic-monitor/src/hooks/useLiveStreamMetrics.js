import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

/**
 * Global live stream metrics hook.
 * Connects to Socket.io, dynamically joins stream rooms,
 * and accumulates real-time density / count data.
 */
export function useLiveStreamMetrics(streamIds = []) {
  const [metricsMap, setMetricsMap] = useState({});
  const metricsRef = useRef({});
  const socketRef = useRef(null);
  const joinedRef = useRef(new Set());

  useEffect(() => {
    if (socketRef.current) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('📡 Live metrics socket connected:', socket.id);
      // Re-join any previously requested rooms
      joinedRef.current.forEach((id) => socket.emit('join_stream', id));
    });

    socket.on('disconnect', () => {
      console.log('📡 Live metrics socket disconnected');
    });

    socket.on('telemetry_update', (data) => {
      if (!data?.streamId || !data?.stats) return;

      const { streamId, stats } = data;

      metricsRef.current = {
        ...metricsRef.current,
        [streamId]: {
          count: stats.count ?? 0,
          density: stats.density ?? 0,
          status: stats.status ?? 'UNKNOWN',
          greenWave: stats.green_wave ?? false,
          avgSpeed: stats.avg_speed ?? 0,
          speeds: stats.speeds ?? {},
          congestionPhase: stats.congestion_phase ?? stats.status ?? 'UNKNOWN',
          timestamp: Date.now(),
        },
      };

      setMetricsMap({ ...metricsRef.current });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Dynamically join / leave rooms whenever streamIds change
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;

    const current = new Set(streamIds);
    const prev = joinedRef.current;

    current.forEach((id) => {
      if (!prev.has(id)) {
        socket.emit('join_stream', id);
        console.log('📡 Joined stream room:', id);
      }
    });

    // Leave old rooms
    prev.forEach((id) => {
      if (!current.has(id)) {
        socket.emit('leave_stream', id);
        console.log('📡 Left stream room:', id);
      }
    });

    joinedRef.current = current;
  }, [streamIds]);

  return metricsMap;
}

export function computeDensityPercent(count, maxCapacity = 50) {
  if (!count || count <= 0) return 0;
  return Math.min((count / maxCapacity) * 100, 100);
}

export function computeSpeedFromDensity(densityPercent) {
  const clamped = Math.max(0, Math.min(100, densityPercent));
  const baseSpeed = 70; // km/h on empty road
  const minSpeed = 5;   // km/h in jam

  // Linear decay: 0% density → 70 km/h, 100% density → 5 km/h
  const linearSpeed = baseSpeed - (clamped / 100) * (baseSpeed - minSpeed);

  // Small sinusoidal fluctuation based on time (period ~8 s)
  const fluctuation = Math.sin(Date.now() / 1300) * 3;

  return Math.max(minSpeed, Math.round(linearSpeed + fluctuation));
}
