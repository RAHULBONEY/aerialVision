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
  
  global.io.emit('new_incident', {
    streamId,
    incident
  });
};

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
  
  global.io.emit('green_wave_alert', {
    streamId,
    ...data
  });
};

exports.getStreamViewerCount = async (streamId) => {
  if (!global.io) return 0;
  const room = global.io.sockets.adapter.rooms.get(`stream_${streamId}`);
  return room ? room.size : 0;
};

exports.emitAnalysisProgress = (streamId, progress, status) => {
  if (!global.io) return;
  global.io.to(`stream_${streamId}`).emit('analysis_progress', {
    streamId,
    progress,
    status,
    timestamp: new Date().toISOString()
  });
};
