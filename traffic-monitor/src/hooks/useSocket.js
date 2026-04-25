import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export function useSocket(streamId, options = {}) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [latestFrame, setLatestFrame] = useState(null);
  const [stats, setStats] = useState({ count: 0, status: 'UNKNOWN', green_wave: false });
  const [streamStatus, setStreamStatus] = useState('IDLE');
  const [analysisProgress, setAnalysisProgress] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [greenWaveActive, setGreenWaveActive] = useState(false);
  const frameBufferRef = useRef([]);
  const MAX_BUFFER_SIZE = options.bufferSize || 300;

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
      console.log('🔌 Socket connected:', socket.id);
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 Socket connection error:', error);
      setConnectionError(error.message);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!socketRef.current || !isConnected || !streamId) return;

    const socket = socketRef.current;

    socket.emit('join_stream', streamId);
    console.log(`📺 Joined stream: ${streamId}`);

    const handleTelemetry = (data) => {
      if (data.streamId !== streamId) return;
      setLatestFrame(data);
      if (data.stats) {
        setStats(data.stats);
      }
      frameBufferRef.current.push({
        frame: data.frame,
        stats: data.stats,
        boxes: data.boxes || [],
        timestamp: data.timestamp
      });
      if (frameBufferRef.current.length > MAX_BUFFER_SIZE) {
        frameBufferRef.current = frameBufferRef.current.slice(-MAX_BUFFER_SIZE);
      }
    };

    const handleStreamStatus = (data) => {
      if (data.streamId !== streamId) return;
      setStreamStatus(data.status);
      if (data.status === 'COMPLETED' || data.status === 'ERROR') {
        setAnalysisProgress(null);
      }
    };

    const handleIncidentAlert = (data) => {
      if (data.streamId !== streamId) return;
      setIncidents(prev => [data.incident, ...prev].slice(0, 50));
    };

    const handleGreenWave = (data) => {
      if (data.streamId !== streamId) return;
      setGreenWaveActive(data.active);
      if (data.active) {
        setTimeout(() => setGreenWaveActive(false), 10000);
      }
    };

    const handleProgress = (data) => {
      if (data.streamId !== streamId) return;
      setAnalysisProgress(data);
    };

    socket.on('telemetry_update', handleTelemetry);
    socket.on('stream_status', handleStreamStatus);
    socket.on('incident_alert', handleIncidentAlert);
    socket.on('green_wave', handleGreenWave);
    socket.on('analysis_progress', handleProgress);

    return () => {
      socket.emit('leave_stream', streamId);
      socket.off('telemetry_update', handleTelemetry);
      socket.off('stream_status', handleStreamStatus);
      socket.off('incident_alert', handleIncidentAlert);
      socket.off('green_wave', handleGreenWave);
      socket.off('analysis_progress', handleProgress);
      frameBufferRef.current = [];
    };
  }, [streamId, isConnected, MAX_BUFFER_SIZE]);

  const getFrameData = useCallback((targetFrame) => {
    const buffer = frameBufferRef.current;
    if (buffer.length === 0) return null;
    let left = 0;
    let right = buffer.length - 1;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (buffer[mid].frame < targetFrame) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    if (left > 0) {
      const prevDiff = Math.abs(buffer[left - 1].frame - targetFrame);
      const currDiff = Math.abs(buffer[left].frame - targetFrame);
      return prevDiff < currDiff ? buffer[left - 1] : buffer[left];
    }
    return buffer[left];
  }, []);

  const clearBuffer = useCallback(() => {
    frameBufferRef.current = [];
    setIncidents([]);
    setGreenWaveActive(false);
  }, []);

  return {
    isConnected,
    connectionError,
    latestFrame,
    stats,
    streamStatus,
    analysisProgress,
    incidents,
    greenWaveActive,
    getFrameData,
    clearBuffer,
    bufferSize: frameBufferRef.current.length
  };
}

export function useGlobalIncidents() {
  const socketRef = useRef(null);
  const [incidents, setIncidents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('new_incident', (data) => {
      setIncidents(prev => [data, ...prev].slice(0, 100));
    });

    socket.on('green_wave_alert', (data) => {
      console.log('🚑 Global Green Wave Alert:', data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { incidents, isConnected };
}
