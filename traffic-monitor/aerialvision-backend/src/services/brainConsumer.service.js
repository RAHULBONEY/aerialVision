const fs = require('fs');
const path = require('path');
const readline = require('readline');
const FormData = require('form-data');
const fetch = require('node-fetch');

const socketService = require('./socket.service');
const incidentService = require('./incident.service');

const GATEWAY_URL = process.env.GATEWAY_URL || 'https://aerialvision.onrender.com';

exports.analyzeSimulation = async (simulationId, streamInfo, model = 'mark4.5') => {
  console.log(`🎬 Starting simulation: ${simulationId}`);
  console.log(`📡 Connecting to Gateway: ${GATEWAY_URL}`);

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

async function streamToBrain(input, streamInfo, model) {
  const formData = new FormData();
  
  if (typeof input === 'string') {
    formData.append('file', fs.createReadStream(input));
  } else {
    formData.append('file', input, { filename: 'video.mp4' });
  }
  
  formData.append('model', model);

  const response = await fetch(`${GATEWAY_URL}/process-upload`, {
    method: 'POST',
    body: formData,
    headers: formData.getHeaders()
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gateway API error: ${response.status} - ${errorText}`);
  }

  await processNDJSONStream(response.body, streamInfo);
}

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

      socketService.emitTelemetry(streamInfo.id, {
        frame: packet.frame || frameCount,
        stats: {
          ...(packet.stats || {}),
          avg_speed: packet.stats?.avg_speed || 0,
          speeds: packet.stats?.speeds || {},
          congestion_phase: packet.stats?.congestion_phase || packet.stats?.status || 'CLEAR'
        },
        boxes: (packet.boxes || []).map(box => ({
          ...box,
          ...(box.track_id !== undefined ? { track_id: box.track_id } : {}),
          ...(box.speed_kmh !== undefined ? { speed_kmh: box.speed_kmh } : {}),
          ...(box.quality !== undefined ? { quality: box.quality } : {})
        })),
        timestamp: Date.now()
      });

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

      if (packet.incidents && packet.incidents.length > 0) {
        for (const incident of packet.incidents) {
          await processIncident(incident, streamInfo, packet);
        }
      }

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

  clearIncidentTracking(streamInfo.id);
  
  console.log(`📊 Processed ${frameCount} frames for ${streamInfo.name}`);
}

const incidentCooldowns = new Map();
const vehicleIncidentTracker = new Map();

const INCIDENT_COOLDOWNS = {
  GREEN_WAVE: 30000,
  STALL: 60000,
  JAM: 120000,
  OBSTRUCTION: 60000,
  SPEEDING: 30000,
  SUDDEN_BRAKING: 30000,
  WRONG_WAY: 60000,
  MULTI_VEHICLE_BLOCKAGE: 120000,
  CONGESTION: 90000,
  DEFAULT: 45000
};

const VEHICLE_COOLDOWN = 30000;

function shouldProcessIncident(incidentData, streamId) {
  const now = Date.now();
  const incidentType = mapIncidentType(incidentData.type);
  const vehicleId = incidentData.vehicle_id;

  if (!incidentCooldowns.has(streamId)) {
    incidentCooldowns.set(streamId, new Map());
  }
  if (!vehicleIncidentTracker.has(streamId)) {
    vehicleIncidentTracker.set(streamId, new Map());
  }

  const streamCooldowns = incidentCooldowns.get(streamId);
  const streamVehicles = vehicleIncidentTracker.get(streamId);

  const lastTypeTime = streamCooldowns.get(incidentType) || 0;
  const typeCooldown = INCIDENT_COOLDOWNS[incidentType] || INCIDENT_COOLDOWNS.DEFAULT;
  
  if (now - lastTypeTime < typeCooldown) {
    return false;
  }

  if (vehicleId) {
    const lastVehicleTime = streamVehicles.get(vehicleId) || 0;
    if (now - lastVehicleTime < VEHICLE_COOLDOWN) {
      return false;
    }
    streamVehicles.set(vehicleId, now);
  }

  streamCooldowns.set(incidentType, now);
  
  return true;
}

function clearIncidentTracking(streamId) {
  incidentCooldowns.delete(streamId);
  vehicleIncidentTracker.delete(streamId);
}

async function processIncident(incidentData, streamInfo, packet) {
  try {
    if (!shouldProcessIncident(incidentData, streamInfo.id)) {
      return;
    }

    const mappedType = mapIncidentType(incidentData.type);
    const severityOverride = {
      'WRONG_WAY': 'CRITICAL',
      'MULTI_VEHICLE_BLOCKAGE': 'CRITICAL',
      'GREEN_WAVE': 'CRITICAL',
      'SUDDEN_BRAKING': 'HIGH',
      'OBSTRUCTION': incidentData.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH'
    };
    const severity = incidentData.severity || severityOverride[mappedType] || 'MEDIUM';
    
    const incidentPayload = {
      type: mappedType,
      description: incidentData.description || `${mappedType} detected`,
      snapshot: incidentData.snapshot || null,
      vehicleCount: packet.stats?.count || 0,
      density: packet.stats?.density || 0,
      speed: mappedType === 'OBSTRUCTION' && !['SUDDEN_BRAKING', 'WRONG_WAY'].includes(incidentData.type?.toUpperCase()) ? 0 : (packet.stats?.avg_speed || 0),
      ...(severity ? { severity } : {})
    };

    const savedIncident = await incidentService.createFromBrain(incidentPayload, streamInfo);
    
    console.log(`🚨 Incident saved: ${savedIncident.type} (${savedIncident.severity})`);

    socketService.emitIncidentAlert(streamInfo.id, savedIncident);

  } catch (error) {
    console.error(`❌ Failed to process incident: ${error.message}`);
  }
}

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
    'high_density': 'CONGESTION',
    'sudden_braking': 'OBSTRUCTION',
    'wrong_way': 'OBSTRUCTION',
    'multi_vehicle_blockage': 'OBSTRUCTION',
    'gridlock': 'CONGESTION',
    'building_up': 'CONGESTION',
    'dissipating': 'CONGESTION'
  };

  const lower = (brainType || '').toLowerCase();
  return typeMap[lower] || brainType?.toUpperCase() || 'UNKNOWN';
}

exports.probeStream = async (streamUrl) => {
  const AI_ENGINE_URL = process.env.AI_ENGINE_URL || GATEWAY_URL;

  try {
    const response = await fetch(`${AI_ENGINE_URL}/probe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceUrl: streamUrl })
    });

    if (!response.ok) {
      throw new Error(`Probe failed: ${response.status}`);
    }

    const probeData = await response.json();
    console.log(`[PROBE] View: ${probeData.viewType} | Model: ${probeData.recommended_model} | ${probeData.reason}`);

    return {
      recommended_model: probeData.recommended_model || 'mark-4.5',
      reason: probeData.reason || 'Probe completed',
      viewType: probeData.viewType || 'GROUND',
      is_locked: probeData.is_locked || false,
      isSimulation: false
    };
  } catch (error) {
    console.warn(`[PROBE] Failed to probe stream, using defaults: ${error.message}`);
    return {
      recommended_model: 'mark-4.5',
      reason: 'Probe unavailable - defaulting to Mark 4.5 for safety',
      viewType: 'GROUND',
      is_locked: false,
      isSimulation: true
    };
  }
};

exports.getSimulationScenarios = async () => {
  try {
    const response = await fetch(`${GATEWAY_URL}/simulations/list`);
    if (!response.ok) {
        throw new Error(`Failed to fetch simulations: ${response.status}`);
    }
    const data = await response.json();
    
    return data.scenarios.map(s => ({
      ...s,
      description: 'Simulation Scenario'
    }));
  } catch (error) {
    console.warn('Failed to fetch simulations from Gateway, using fallbacks:', error.message);
    return [
      { id: 'sim_ambulance_01', name: 'Emergency Corridor (Fallback)', description: 'Simulated Ambulance' }
    ];
  }
};
