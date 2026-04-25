const { db } = require('../config/firebase');
const admin = require('firebase-admin');
const ragService = require('./rag.service');

const COLLECTION = 'incidents';

exports.buildRagContent = buildRagContent;

function buildRagContent(data) {
  const ts = typeof data.timestamp === 'string' ? data.timestamp : new Date().toISOString();

  let content = `At ${ts}, a ${data.severity || 'UNKNOWN'} ${data.type || 'UNKNOWN'} incident was detected on stream '${data.streamName || 'Unknown'}' (ID: ${data.streamId || 'unknown'}). `;
  content += `Description: ${data.description || 'No description'}. `;
  content += `Traffic density: ${data.density ?? 'N/A'}, Vehicle count: ${data.vehicleCount ?? 'N/A'}, Average speed: ${data.speed ?? 'N/A'} km/h. `;
  content += `Status: ${data.status || 'NEW'}. `;

  if (data.ackedBy) {
    const ackedAtStr = data.ackedAt
      ? (typeof data.ackedAt === 'string' ? data.ackedAt : data.ackedAt.toDate?.()?.toISOString?.() || 'unknown time')
      : 'unknown time';
    content += `Acknowledged by ${data.ackedBy} at ${ackedAtStr}. `;
  }
  if (data.note) {
    content += `Note: "${data.note}". `;
  }
  if (data.operatorAction && data.operatorAction.ackedBy) {
    content += `Operator action taken by ${data.operatorAction.ackedBy}. `;
  }
  if (data.resolution) {
    content += `Resolution: ${data.resolution}. `;
  }
  if (!data.ackedBy && data.status === 'NEW') {
    content += `No operator assigned yet.`;
  }

  return content.trim();
}

exports.createFromBrain = async (payload, streamInfo) => {
  const {
    type,
    description,
    snapshot,
    vehicleCount = 0,
    density = 0,
    speed = 0,
  } = payload;

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
      image: snapshot
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

  const ragContent = buildRagContent({
    timestamp: new Date().toISOString(),
    severity,
    type: type || 'UNKNOWN',
    streamName: streamInfo.name,
    streamId: streamInfo.id,
    description: description || `${type} detected on ${streamInfo.name}`,
    density,
    vehicleCount,
    speed,
    status: 'NEW'
  });

  incident.ragContent = ragContent;

  try {
    const embeddingArray = await ragService.getEmbedding(ragContent);
    incident.embedding = admin.firestore.FieldValue.vector(embeddingArray);
  } catch (err) {
    console.error('RAG embedding failed for incident:', err.message);
    incident.ragStatus = 'EMBEDDING_FAILED';
  }

  const docRef = await db.collection(COLLECTION).add(incident);
  
  return {
    id: docRef.id,
    ...incident,
    timestamp: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
};

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
    query = query.limit(50);
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

exports.acknowledge = async (id, userId, note = null, userName = null) => {
  const docRef = db.collection(COLLECTION).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new Error('Incident not found');
  }

  const existing = doc.data();
  if (existing.status !== 'NEW') {
    throw new Error('Incident already acknowledged');
  }

  const ackedByName = userName || userId;
  const ackedNote = note || 'Acknowledged via Dashboard';

  const newRagContent = buildRagContent({
    timestamp: existing.timestamp?.toDate?.()?.toISOString?.() || new Date().toISOString(),
    severity: existing.severity,
    type: existing.type,
    streamName: existing.streamName,
    streamId: existing.streamId,
    description: existing.description,
    density: existing.snapshot?.density,
    vehicleCount: existing.snapshot?.vehicleCount,
    speed: existing.snapshot?.speed,
    status: 'ACKNOWLEDGED',
    ackedBy: ackedByName,
    ackedAt: new Date().toISOString(),
    note: ackedNote,
    operatorAction: { ackedBy: ackedByName }
  });

  const updateFields = {
    status: 'ACKNOWLEDGED',
    ackedBy: ackedByName,
    ackedAt: admin.firestore.FieldValue.serverTimestamp(),
    note: ackedNote,
    ragContent: newRagContent,
    operatorAction: {
      ackedBy: ackedByName,
      ackedAt: new Date().toISOString(),
      note: ackedNote
    }
  };

  try {
    const embeddingArray = await ragService.getEmbedding(newRagContent);
    updateFields.embedding = admin.firestore.FieldValue.vector(embeddingArray);
  } catch (err) {
    console.error('RAG re-embedding failed on acknowledge:', err.message);
  }

  await docRef.update(updateFields);

  return exports.getById(id);
};

exports.resolve = async (id, resolution) => {
  const docRef = db.collection(COLLECTION).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new Error('Incident not found');
  }

  const existing = doc.data();

  const newRagContent = buildRagContent({
    timestamp: existing.timestamp?.toDate?.()?.toISOString?.() || new Date().toISOString(),
    severity: existing.severity,
    type: existing.type,
    streamName: existing.streamName,
    streamId: existing.streamId,
    description: existing.description,
    density: existing.snapshot?.density,
    vehicleCount: existing.snapshot?.vehicleCount,
    speed: existing.snapshot?.speed,
    status: 'RESOLVED',
    ackedBy: existing.ackedBy,
    ackedAt: existing.ackedAt,
    note: existing.note,
    resolution: resolution
  });

  const updateFields = {
    status: 'RESOLVED',
    resolution,
    resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
    ragContent: newRagContent
  };

  try {
    const embeddingArray = await ragService.getEmbedding(newRagContent);
    updateFields.embedding = admin.firestore.FieldValue.vector(embeddingArray);
  } catch (err) {
    console.error('RAG re-embedding failed on resolve:', err.message);
  }

  await docRef.update(updateFields);

  return exports.getById(id);
};

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

function determineSeverity(type, data = {}) {
  switch (type) {
    case 'GREEN_WAVE':
      return 'CRITICAL';
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
