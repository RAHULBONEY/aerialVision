import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

/**
 * Socket.io hook for real-time stream telemetry
 * @param {string} streamId - Stream to subscribe to
 * @param {object} options - Configuration options
 */
export function useSocket(streamId, options = {}) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  
  // Telemetry state
  const [latestFrame, setLatestFrame] = useState(null);
  const [stats, setStats] = useState({ count: 0, status: 'UNKNOWN', green_wave: false });
  const [streamStatus, setStreamStatus] = useState('IDLE');
  const [analysisProgress, setAnalysisProgress] = useState(null);
  
  // Incident state
  const [incidents, setIncidents] = useState([]);
  const [greenWaveActive, setGreenWaveActive] = useState(false);

  // Frame buffer for sync (stores last N frames)
  const frameBufferRef = useRef([]);
  const MAX_BUFFER_SIZE = options.bufferSize || 300;

  // Connect to socket
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

  // Join stream room when streamId changes
  useEffect(() => {
    if (!socketRef.current || !isConnected || !streamId) return;

    const socket = socketRef.current;

    // Join the stream room
    socket.emit('join_stream', streamId);
    console.log(`📺 Joined stream: ${streamId}`);

    // Telemetry handler
    const handleTelemetry = (data) => {
      if (data.streamId !== streamId) return;

      setLatestFrame(data);
      
      if (data.stats) {
        setStats(data.stats);
      }

      // Add to frame buffer
      frameBufferRef.current.push({
        frame: data.frame,
        stats: data.stats,
        boxes: data.boxes || [],
        timestamp: data.timestamp
      });

      // Prune old frames
      if (frameBufferRef.current.length > MAX_BUFFER_SIZE) {
        frameBufferRef.current = frameBufferRef.current.slice(-MAX_BUFFER_SIZE);
      }
    };

    // Stream status handler
    const handleStreamStatus = (data) => {
      if (data.streamId !== streamId) return;
      setStreamStatus(data.status);
      
      if (data.status === 'COMPLETED' || data.status === 'ERROR') {
        setAnalysisProgress(null);
      }
    };

    // Incident handler
    const handleIncidentAlert = (data) => {
      if (data.streamId !== streamId) return;
      setIncidents(prev => [data.incident, ...prev].slice(0, 50));
    };

    // Green Wave handler
    const handleGreenWave = (data) => {
      if (data.streamId !== streamId) return;
      setGreenWaveActive(data.active);
      
      // Auto-clear after 10 seconds
      if (data.active) {
        setTimeout(() => setGreenWaveActive(false), 10000);
      }
    };

    // Analysis progress handler
    const handleProgress = (data) => {
      if (data.streamId !== streamId) return;
      setAnalysisProgress(data);
    };

    // Subscribe to events
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
      
      // Clear buffer
      frameBufferRef.current = [];
    };
  }, [streamId, isConnected, MAX_BUFFER_SIZE]);

  /**
   * Get frame data closest to target frame number
   * Uses binary search for performance
   */
  const getFrameData = useCallback((targetFrame) => {
    const buffer = frameBufferRef.current;
    if (buffer.length === 0) return null;

    // Binary search for closest frame
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

    // Return closest match
    if (left > 0) {
      const prevDiff = Math.abs(buffer[left - 1].frame - targetFrame);
      const currDiff = Math.abs(buffer[left].frame - targetFrame);
      return prevDiff < currDiff ? buffer[left - 1] : buffer[left];
    }

    return buffer[left];
  }, []);

  /**
   * Clear frame buffer
   */
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

/**
 * Hook for global incident listening (dashboard)
 */
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
      // Could trigger global notification here
      console.log('🚑 Global Green Wave Alert:', data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { incidents, isConnected };
}
