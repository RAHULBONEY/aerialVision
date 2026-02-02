/**
 * Brain Consumer Service - Proxy to Remote AI Brain
 * Streams video to Brain, processes NDJSON responses, broadcasts telemetry
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const FormData = require('form-data');
const fetch = require('node-fetch');

const socketService = require('./socket.service');
const incidentService = require('./incident.service');

// Brain API configuration
// Python Gateway configuration
const GATEWAY_URL = 'http://localhost:8001';

/**
 * Analyze a simulation stream by streaming via Python Gateway
 * @param {string} simulationId - Simulation scenario ID
 * @param {object} streamInfo - Stream metadata (id, name)
 * @param {string} model - Model to use (defaults to mark4.5)
 * @returns {Promise} Resolves when analysis completes
 */
exports.analyzeSimulation = async (simulationId, streamInfo, model = 'mark4.5') => {
  console.log(`🎬 Starting simulation: ${simulationId}`);
  console.log(`📡 Connecting to Gateway: ${GATEWAY_URL}`);

  // Emit stream started
  socketService.emitStreamStatus(streamInfo.id, 'ANALYZING', {
    simulation: simulationId,
    model
  });

  try {
    const formData = new FormData();
    formData.append('simulation_id', simulationId);
    formData.append('model', model);

    const response = await fetch(`${GATEWAY_URL}/process-simulation`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gateway API error: ${response.status} - ${errorText}`);
    }

    // Process NDJSON stream line-by-line
    await processNDJSONStream(response.body, streamInfo);
    
    socketService.emitStreamStatus(streamInfo.id, 'COMPLETED', {
      simulation: simulationId
    });
    
    console.log(`✅ Simulation complete: ${simulationId}`);
  } catch (error) {
    console.error(`❌ Simulation failed: ${error.message}`);
    socketService.emitStreamStatus(streamInfo.id, 'ERROR', {
      error: error.message
    });
    throw error;
  }
};

/**
 * Analyze an uploaded video file
 * @param {Buffer|string} filePathOrBuffer - Video file path or buffer
 * @param {object} streamInfo - Stream metadata
 * @param {string} model - Model to use
 * @returns {Promise}
 */
exports.analyzeUploadedVideo = async (filePathOrBuffer, streamInfo, model = 'mark4.5') => {
  console.log(`📹 Analyzing uploaded video for stream: ${streamInfo.id}`);
  
  socketService.emitStreamStatus(streamInfo.id, 'ANALYZING', { model });

  try {
    await streamToBrain(filePathOrBuffer, streamInfo, model);
    
    socketService.emitStreamStatus(streamInfo.id, 'COMPLETED');
    console.log(`✅ Analysis complete for stream: ${streamInfo.id}`);
  } catch (error) {
    console.error(`❌ Analysis failed: ${error.message}`);
    socketService.emitStreamStatus(streamInfo.id, 'ERROR', {
      error: error.message
    });
    throw error;
  }
};

/**
 * Stream video to Remote Brain (via Gateway for uploads)
 * @param {string|Buffer} input - File path or buffer
 * @param {object} streamInfo - Stream metadata
 * @param {string} model - Model name
 */
async function streamToBrain(input, streamInfo, model) {
  const formData = new FormData();
  
  // Handle file path or buffer
  if (typeof input === 'string') {
    formData.append('file', fs.createReadStream(input));
  } else {
    formData.append('file', input, { filename: 'video.mp4' });
  }
  
  formData.append('model', model);

  // For uploads, we can also use the Gateway's /process-upload if desired, 
  // or keep valid remote connection. The user requested Gateway integration.
  // Let's assume uploading uses the Gateway too for consistency.
  const response = await fetch(`${GATEWAY_URL}/process-upload`, {
    method: 'POST',
    body: formData,
    headers: formData.getHeaders()
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gateway API error: ${response.status} - ${errorText}`);
  }

  // Process NDJSON stream line-by-line
  await processNDJSONStream(response.body, streamInfo);
}

/**
 * Process NDJSON response stream line-by-line
 * @param {ReadableStream} stream - Response body stream
 * @param {object} streamInfo - Stream metadata
 */
async function processNDJSONStream(stream, streamInfo) {
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity
  });

  let frameCount = 0;
  let lastGreenWave = false;

  for await (const line of rl) {
    if (!line.trim()) continue;

    try {
      const packet = JSON.parse(line);
      frameCount++;

      // Emit telemetry to frontend
      socketService.emitTelemetry(streamInfo.id, {
        frame: packet.frame || frameCount,
        stats: packet.stats || {},
        boxes: packet.boxes || [], // Bounding boxes if included
        timestamp: Date.now()
      });

      // Check for Green Wave (ambulance detection)
      if (packet.stats?.green_wave && !lastGreenWave) {
        console.log(`🚑 GREEN WAVE ACTIVATED on ${streamInfo.name}`);
        socketService.emitGreenWave(streamInfo.id, {
          frame: packet.frame,
          message: 'AMBULANCE DETECTED - CLEARING CORRIDOR'
        });
        lastGreenWave = true;
      } else if (!packet.stats?.green_wave) {
        lastGreenWave = false;
      }

      // Process incidents
      if (packet.incidents && packet.incidents.length > 0) {
        for (const incident of packet.incidents) {
          await processIncident(incident, streamInfo, packet);
        }
      }

      // Emit progress every 30 frames
      if (frameCount % 30 === 0) {
        socketService.emitAnalysisProgress(streamInfo.id, {
          frame: frameCount,
          processed: frameCount
        }, `Processed ${frameCount} frames`);
      }

    } catch (parseError) {
      console.warn(`⚠️ Failed to parse NDJSON line: ${parseError.message}`);
    }
  }

  // Clear tracking for this stream when done
  clearIncidentTracking(streamInfo.id);
  
  console.log(`📊 Processed ${frameCount} frames for ${streamInfo.name}`);
}

// =====================================================
// INCIDENT RATE LIMITING & DEDUPLICATION
// =====================================================

// Track last incident time per stream per type to prevent spam
const incidentCooldowns = new Map(); // streamId -> { type -> lastTimestamp }
const vehicleIncidentTracker = new Map(); // streamId -> { vehicleId -> lastIncidentTime }

// Cooldown periods in milliseconds for different incident types
const INCIDENT_COOLDOWNS = {
  GREEN_WAVE: 30000,      // 30 seconds - ambulance incidents
  STALL: 60000,           // 60 seconds - stalled vehicle
  JAM: 120000,            // 2 minutes - traffic jam
  OBSTRUCTION: 60000,     // 60 seconds
  SPEEDING: 30000,        // 30 seconds
  DEFAULT: 45000          // 45 seconds for unknown types
};

// Minimum time between incidents for the same vehicle (in ms)
const VEHICLE_COOLDOWN = 30000; // 30 seconds per vehicle

/**
 * Check if we should process this incident or skip it (rate limiting)
 * @param {object} incidentData - Incident from Brain
 * @param {string} streamId - Stream ID
 * @returns {boolean} true if should process, false to skip
 */
function shouldProcessIncident(incidentData, streamId) {
  const now = Date.now();
  const incidentType = mapIncidentType(incidentData.type);
  const vehicleId = incidentData.vehicle_id;

  // Initialize tracking for this stream if needed
  if (!incidentCooldowns.has(streamId)) {
    incidentCooldowns.set(streamId, new Map());
  }
  if (!vehicleIncidentTracker.has(streamId)) {
    vehicleIncidentTracker.set(streamId, new Map());
  }

  const streamCooldowns = incidentCooldowns.get(streamId);
  const streamVehicles = vehicleIncidentTracker.get(streamId);

  // Check type-based cooldown
  const lastTypeTime = streamCooldowns.get(incidentType) || 0;
  const typeCooldown = INCIDENT_COOLDOWNS[incidentType] || INCIDENT_COOLDOWNS.DEFAULT;
  
  if (now - lastTypeTime < typeCooldown) {
    return false; // Still in cooldown for this type
  }

  // Check vehicle-based cooldown (if vehicle ID is present)
  if (vehicleId) {
    const lastVehicleTime = streamVehicles.get(vehicleId) || 0;
    if (now - lastVehicleTime < VEHICLE_COOLDOWN) {
      return false; // This specific vehicle was recently reported
    }
    // Update vehicle tracking
    streamVehicles.set(vehicleId, now);
  }

  // Update type cooldown
  streamCooldowns.set(incidentType, now);
  
  return true;
}

/**
 * Clear incident tracking for a stream (call when stream ends)
 * @param {string} streamId 
 */
function clearIncidentTracking(streamId) {
  incidentCooldowns.delete(streamId);
  vehicleIncidentTracker.delete(streamId);
}

/**
 * Process a single incident from Brain (with rate limiting)
 * @param {object} incidentData - Incident from Brain
 * @param {object} streamInfo - Stream metadata
 * @param {object} packet - Full telemetry packet
 */
async function processIncident(incidentData, streamInfo, packet) {
  try {
    // RATE LIMITING: Check if we should process this incident
    if (!shouldProcessIncident(incidentData, streamInfo.id)) {
      // Skip this incident - still in cooldown period
      return;
    }

    // Map Brain incident types to our schema
    const mappedType = mapIncidentType(incidentData.type);
    
    const incidentPayload = {
      type: mappedType,
      description: incidentData.description || `${mappedType} detected`,
      snapshot: incidentData.snapshot || null,
      vehicleCount: packet.stats?.count || 0,
      density: packet.stats?.density || 0,
      speed: mappedType === 'OBSTRUCTION' ? 0 : (packet.stats?.avg_speed || 0)
    };

    // Save to Firestore
    const savedIncident = await incidentService.createFromBrain(incidentPayload, streamInfo);
    
    console.log(`🚨 Incident saved: ${savedIncident.type} (${savedIncident.severity})`);

    // Emit alert to frontend
    socketService.emitIncidentAlert(streamInfo.id, savedIncident);

  } catch (error) {
    console.error(`❌ Failed to process incident: ${error.message}`);
  }
}

/**
 * Map Brain incident types to our schema types
 * @param {string} brainType - Type from Brain
 * @returns {string} Mapped type
 */
function mapIncidentType(brainType) {
  const typeMap = {
    'stall': 'OBSTRUCTION',
    'stalled': 'OBSTRUCTION',
    'obstruction': 'OBSTRUCTION',
    'ambulance': 'GREEN_WAVE',
    'emergency': 'GREEN_WAVE',
    'green_wave': 'GREEN_WAVE',
    'jam': 'CONGESTION',
    'congestion': 'CONGESTION',
    'high_density': 'CONGESTION'
  };

  const lower = (brainType || '').toLowerCase();
  return typeMap[lower] || brainType?.toUpperCase() || 'UNKNOWN';
}

/**
 * Probe for recommended model (hardcoded to mark4.5 for Ironclad safety)
 * @param {string} streamUrl - Stream URL (unused in simulation mode)
 * @returns {object} Probe result
 */
exports.probeStream = async (streamUrl) => {
  // For demo/simulation, always recommend Mark 4.5 (Ironclad)
  return {
    recommended_model: 'mark4.5',
    reason: 'Ironclad Safety Protocols - Mark 4.5 achieves 53.3% mAP on Ambulance detection',
    viewType: 'GROUND',
    isSimulation: true
  };
};

/**
 * Get available simulation scenarios from Gateway
 * @returns {Promise<array>} List of scenarios
 */
exports.getSimulationScenarios = async () => {
  try {
    const response = await fetch(`${GATEWAY_URL}/simulations/list`);
    if (!response.ok) {
        throw new Error(`Failed to fetch simulations: ${response.status}`);
    }
    const data = await response.json();
    
    // Gateway returns { success: true, scenarios: [{id, name}, ...] }
    return data.scenarios.map(s => ({
      ...s,
      description: 'Simulation Scenario' // Gateway might not return description yet
    }));
  } catch (error) {
    console.warn('Failed to fetch simulations from Gateway, using fallbacks:', error.message);
    // Fallback if Gateway is offline
    return [
      { id: 'sim_ambulance_01', name: 'Emergency Corridor (Fallback)', description: 'Simulated Ambulance' }
    ];
  }
};
