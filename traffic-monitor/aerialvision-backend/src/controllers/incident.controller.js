const { db } = require('../config/firebase');
const admin = require('firebase-admin');
const incidentService = require('../services/incident.service');
const brainConsumerService = require('../services/brainConsumer.service');

/**
 * List incidents with optional filters
 */
exports.listIncidents = async (req, res) => {
  try {
    const { status, type, streamId, limit } = req.query;
    const incidents = await incidentService.list({ status, type, streamId, limit });
    
    res.json({
      success: true,
      data: incidents,
      count: incidents.length
    });
  } catch (error) {
    console.error('List incidents error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get single incident by ID
 */
exports.getIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const incident = await incidentService.getById(id);
    
    res.json({
      success: true,
      data: incident
    });
  } catch (error) {
    if (error.message === 'Incident not found') {
      return res.status(404).json({ success: false, message: error.message });
    }
    console.error('Get incident error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Acknowledge an incident (existing endpoint, enhanced)
 */
exports.acknowledgeIncident = async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;
  const userId = req.user.uid;
  const userName = req.user.name || req.user.email;

  try {
    const incident = await incidentService.acknowledge(id, userId, note, userName);
    
    res.json({
      success: true,
      message: 'Incident acknowledged',
      data: incident
    });
  } catch (error) {
    if (error.message === 'Incident not found') {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === 'Incident already acknowledged') {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Acknowledge error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Resolve an incident
 */
exports.resolveIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution } = req.body;
    
    const incident = await incidentService.resolve(id, resolution);
    
    res.json({
      success: true,
      message: 'Incident resolved',
      data: incident
    });
  } catch (error) {
    if (error.message === 'Incident not found') {
      return res.status(404).json({ success: false, message: error.message });
    }
    console.error('Resolve error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get incident statistics
 */
exports.getIncidentStats = async (req, res) => {
  try {
    const stats = await incidentService.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Start simulation analysis
 * POST /api/incidents/analyze/simulation
 */
exports.startSimulation = async (req, res) => {
  try {
    const { simulationId, streamId, streamName, model } = req.body;

    if (!simulationId) {
      return res.status(400).json({
        success: false,
        message: 'simulationId is required'
      });
    }

    // Get available scenarios (async - fetches from Gateway)
    const scenarios = await brainConsumerService.getSimulationScenarios();
    
    // Handle case where scenarios is not an array
    if (!Array.isArray(scenarios)) {
      // If scenarios failed to load, just proceed with the simulation
      console.warn('Could not fetch scenarios list, proceeding anyway');
    }
    
    const scenario = Array.isArray(scenarios) 
      ? scenarios.find(s => s.id === simulationId)
      : { id: simulationId, name: simulationId };

    if (!scenario && Array.isArray(scenarios)) {
      return res.status(400).json({
        success: false,
        message: `Unknown simulation: ${simulationId}`,
        available: scenarios.map(s => s.id)
      });
    }

    // Probe for recommended model (always mark4.5 for simulations)
    const probe = await brainConsumerService.probeStream();

    // Start async analysis (don't await - runs in background)
    const finalStreamId = streamId || simulationId;
    const streamInfo = {
      id: finalStreamId,
      name: streamName || scenario.name
    };

    // Fire and forget - analysis runs in background
    brainConsumerService.analyzeSimulation(
      simulationId,
      streamInfo,
      model || probe.recommended_model
    ).catch(err => {
      console.error('Background simulation failed:', err);
    });

    res.json({
      success: true,
      message: 'Simulation started',
      data: {
        simulationId,
        streamId: finalStreamId,
        scenario: scenario.name,
        model: model || probe.recommended_model,
        probe
      }
    });

  } catch (error) {
    console.error('Start simulation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get available simulation scenarios
 */
exports.getSimulations = async (req, res) => {
  try {
    // FIX: Added await because getSimulationScenarios is async (fetches from Python Gateway)
    const scenarios = await brainConsumerService.getSimulationScenarios();
    
    res.json({
      success: true,
      data: scenarios
    });
  } catch (error) {
    console.error('Get simulations error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Analyze uploaded video file
 * POST /api/incidents/analyze/upload (with multipart form)
 */
exports.analyzeUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No video file uploaded'
      });
    }

    const { streamId, streamName, model } = req.body;
    
    // Probe for recommended model
    const probe = await brainConsumerService.probeStream();
    
    const finalStreamId = streamId || `upload_${Date.now()}`;
    const streamInfo = {
      id: finalStreamId,
      name: streamName || 'Uploaded Video'
    };

    // Start async analysis
    brainConsumerService.analyzeUploadedVideo(
      req.file.buffer,
      streamInfo,
      model || probe.recommended_model
    ).catch(err => {
      console.error('Background upload analysis failed:', err);
    });

    res.json({
      success: true,
      message: 'Analysis started',
      data: {
        streamId: finalStreamId,
        filename: req.file.originalname,
        model: model || probe.recommended_model,
        probe
      }
    });

  } catch (error) {
    console.error('Analyze upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};