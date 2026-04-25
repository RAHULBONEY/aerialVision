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
        stats: packet.stats || {},
        boxes: packet.boxes || [],
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
    
    const incidentPayload = {
      type: mappedType,
      description: incidentData.description || `${mappedType} detected`,
      snapshot: incidentData.snapshot || null,
      vehicleCount: packet.stats?.count || 0,
      density: packet.stats?.density || 0,
      speed: mappedType === 'OBSTRUCTION' ? 0 : (packet.stats?.avg_speed || 0)
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
    'high_density': 'CONGESTION'
  };

  const lower = (brainType || '').toLowerCase();
  return typeMap[lower] || brainType?.toUpperCase() || 'UNKNOWN';
}

exports.probeStream = async (streamUrl) => {
  return {
    recommended_model: 'mark4.5',
    reason: 'Ironclad Safety Protocols - Mark 4.5 achieves 53.3% mAP on Ambulance detection',
    viewType: 'GROUND',
    isSimulation: true
  };
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
