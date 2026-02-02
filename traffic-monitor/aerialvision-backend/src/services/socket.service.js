/**
 * Socket Service - Manages real-time communication for stream telemetry
 */

/**
 * Emit telemetry update to all clients watching a specific stream
 * @param {string} streamId - The stream identifier
 * @param {object} data - Telemetry data (frame, stats, etc.)
 */
exports.emitTelemetry = (streamId, data) => {
  if (!global.io) {
    console.warn('Socket.io not initialized');
    return;
  }
  global.io.to(`stream_${streamId}`).emit('telemetry_update', {
    streamId,
    timestamp: new Date().toISOString(),
    ...data
  });
};

/**
 * Emit incident alert to all clients watching a specific stream
 * @param {string} streamId - The stream identifier
 * @param {object} incident - Incident data
 */
exports.emitIncidentAlert = (streamId, incident) => {
  if (!global.io) {
    console.warn('Socket.io not initialized');
    return;
  }
  global.io.to(`stream_${streamId}`).emit('incident_alert', {
    streamId,
    timestamp: new Date().toISOString(),
    incident
  });
  
  // Also emit to global incident channel for dashboard
  global.io.emit('new_incident', {
    streamId,
    incident
  });
};

/**
 * Emit stream status update (started, stopped, error, etc.)
 * @param {string} streamId - The stream identifier
 * @param {string} status - Status string
 * @param {object} metadata - Additional metadata
 */
exports.emitStreamStatus = (streamId, status, metadata = {}) => {
  if (!global.io) {
    console.warn('Socket.io not initialized');
    return;
  }
  global.io.to(`stream_${streamId}`).emit('stream_status', {
    streamId,
    status,
    timestamp: new Date().toISOString(),
    ...metadata
  });
};

/**
 * Emit Green Wave alert (ambulance detected - critical priority)
 * @param {string} streamId - The stream identifier
 * @param {object} data - Green wave data
 */
exports.emitGreenWave = (streamId, data) => {
  if (!global.io) {
    console.warn('Socket.io not initialized');
    return;
  }
  global.io.to(`stream_${streamId}`).emit('green_wave', {
    streamId,
    timestamp: new Date().toISOString(),
    active: true,
    ...data
  });
  
  // Broadcast globally for dashboard awareness
  global.io.emit('green_wave_alert', {
    streamId,
    ...data
  });
};

/**
 * Get count of clients watching a specific stream
 * @param {string} streamId - The stream identifier
 * @returns {number} Number of connected clients
 */
exports.getStreamViewerCount = async (streamId) => {
  if (!global.io) return 0;
  const room = global.io.sockets.adapter.rooms.get(`stream_${streamId}`);
  return room ? room.size : 0;
};

/**
 * Broadcast analysis progress
 * @param {string} streamId - The stream identifier
 * @param {number} progress - Progress percentage (0-100)
 * @param {string} status - Current status message
 */
exports.emitAnalysisProgress = (streamId, progress, status) => {
  if (!global.io) return;
  global.io.to(`stream_${streamId}`).emit('analysis_progress', {
    streamId,
    progress,
    status,
    timestamp: new Date().toISOString()
  });
};
