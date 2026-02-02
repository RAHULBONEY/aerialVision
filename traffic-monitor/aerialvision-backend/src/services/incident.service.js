/**
 * Incident Service - Manages incident CRUD operations in Firestore
 * Schema matches the exact structure required by the system
 */
const { db } = require('../config/firebase');
const admin = require('firebase-admin');

const COLLECTION = 'incidents';

/**
 * Create a new incident from Brain detection
 * @param {object} payload - Incident data from Brain
 * @param {object} streamInfo - Stream metadata (id, name)
 * @returns {object} Created incident with Firestore ID
 */
exports.createFromBrain = async (payload, streamInfo) => {
  const {
    type,
    description,
    snapshot,
    vehicleCount = 0,
    density = 0,
    speed = 0,
  } = payload;

  // Determine severity based on incident type
  const severity = determineSeverity(type, payload);

  const incident = {
    type: type || 'UNKNOWN',
    severity,
    description: description || `${type} detected on ${streamInfo.name}`,
    streamId: streamInfo.id,
    streamName: streamInfo.name || 'Unknown Stream',
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    status: 'NEW',
    snapshot: snapshot ? {
      density: density,
      speed: speed,
      vehicleCount: vehicleCount,
      image: snapshot // Base64 image if provided
    } : {
      density,
      speed,
      vehicleCount
    },
    operatorAction: {},
    ackedBy: null,
    ackedAt: null,
    note: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const docRef = await db.collection(COLLECTION).add(incident);
  
  return {
    id: docRef.id,
    ...incident,
    timestamp: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
};

/**
 * List incidents with optional filters
 * @param {object} filters - Optional filters (status, type, streamId, limit)
 * @returns {array} List of incidents
 */
exports.list = async (filters = {}) => {
  let query = db.collection(COLLECTION);

  if (filters.status) {
    query = query.where('status', '==', filters.status);
  }

  if (filters.type) {
    query = query.where('type', '==', filters.type);
  }

  if (filters.streamId) {
    query = query.where('streamId', '==', filters.streamId);
  }

  query = query.orderBy('timestamp', 'desc');

  if (filters.limit) {
    query = query.limit(parseInt(filters.limit));
  } else {
    query = query.limit(50); // Default limit
  }

  const snapshot = await query.get();

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      timestamp: data.timestamp?.toDate?.()?.toISOString() || null,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      ackedAt: data.ackedAt?.toDate?.()?.toISOString() || data.ackedAt || null
    };
  });
};

/**
 * Get a single incident by ID
 * @param {string} id - Incident ID
 * @returns {object} Incident data
 */
exports.getById = async (id) => {
  const doc = await db.collection(COLLECTION).doc(id).get();

  if (!doc.exists) {
    throw new Error('Incident not found');
  }

  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    timestamp: data.timestamp?.toDate?.()?.toISOString() || null,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
    ackedAt: data.ackedAt?.toDate?.()?.toISOString() || data.ackedAt || null
  };
};

/**
 * Acknowledge an incident
 * @param {string} id - Incident ID
 * @param {string} userId - Operator user ID
 * @param {string} note - Optional note
 * @param {string} userName - Operator name
 * @returns {object} Updated incident
 */
exports.acknowledge = async (id, userId, note = null, userName = null) => {
  const docRef = db.collection(COLLECTION).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new Error('Incident not found');
  }

  if (doc.data().status !== 'NEW') {
    throw new Error('Incident already acknowledged');
  }

  await docRef.update({
    status: 'ACKNOWLEDGED',
    ackedBy: userName || userId,
    ackedAt: admin.firestore.FieldValue.serverTimestamp(),
    note: note || 'Acknowledged via Dashboard',
    operatorAction: {
      ackedBy: userName || userId,
      ackedAt: new Date().toISOString(),
      note: note || 'Acknowledged via Dashboard'
    }
  });

  return exports.getById(id);
};

/**
 * Resolve an incident
 * @param {string} id - Incident ID
 * @param {string} resolution - Resolution details
 * @returns {object} Updated incident
 */
exports.resolve = async (id, resolution) => {
  const docRef = db.collection(COLLECTION).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new Error('Incident not found');
  }

  await docRef.update({
    status: 'RESOLVED',
    resolution,
    resolvedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return exports.getById(id);
};

/**
 * Get incident statistics
 * @returns {object} Stats summary
 */
exports.getStats = async () => {
  const snapshot = await db.collection(COLLECTION).get();
  
  const stats = {
    total: 0,
    new: 0,
    acknowledged: 0,
    resolved: 0,
    byType: {}
  };

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    stats.total++;
    
    if (data.status === 'NEW') stats.new++;
    else if (data.status === 'ACKNOWLEDGED') stats.acknowledged++;
    else if (data.status === 'RESOLVED') stats.resolved++;

    if (data.type) {
      stats.byType[data.type] = (stats.byType[data.type] || 0) + 1;
    }
  });

  return stats;
};

/**
 * Determine severity based on incident type and data
 * @param {string} type - Incident type
 * @param {object} data - Additional data
 * @returns {string} Severity level
 */
function determineSeverity(type, data = {}) {
  switch (type) {
    case 'GREEN_WAVE':
      return 'CRITICAL'; // Ambulance = always critical
    case 'CONGESTION':
      if (data.vehicleCount > 25) return 'CRITICAL';
      if (data.vehicleCount > 20) return 'HIGH';
      return 'MEDIUM';
    case 'OBSTRUCTION':
      if (data.speed === 0) return 'MEDIUM';
      return 'LOW';
    default:
      return 'LOW';
  }
}
