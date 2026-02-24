const admin = require("firebase-admin");
const db = admin.firestore();
const fetch = require("node-fetch");

const COLLECTION = "streams";
// Local fallback: http://localhost:8001
const AI_ENGINE_URL = process.env.AI_ENGINE_URL || "https://aerialvision.onrender.com";
exports.create = async (payload, userId) => {
  const { name, type, sourceUrl, model, assignedRoles, simulationId } = payload;

  const ref = await db.collection(COLLECTION).add({
    name,
    type,
    sourceUrl: type === 'SIMULATION' ? (simulationId || 'simulation') : sourceUrl,
    model,
    assignedRoles,
    status: "active",
    createdBy: userId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    simulationId: type === 'SIMULATION' ? simulationId : null
  });

  // Handle Simulation
  if (type === 'SIMULATION') {
    console.log(`🎬 Triggering Simulation Analysis for ${ref.id}`);
    const brainConsumerService = require('./brainConsumer.service');
    
    // Run in background (fire and forget from API perspective)
    brainConsumerService.analyzeSimulation(simulationId, { id: ref.id, name }, model)
      .catch(err => {
        console.error(`❌ Background Simulation Error: ${err.message}`);
        ref.update({ status: 'ERROR', error: err.message });
      });

    return { id: ref.id, name, type, status: 'active', simulationId };
  }

  // Handle RTSP / Webcam / YouTube via connection to old AI Engine (or use Brain Proxy for all?)
  // For now, keeping legacy behavior for non-simulation as per instructions to only implement simulation integration
  console.log("🚀 ATTEMPTING CONNECTION TO AI ENGINE WITH HEADERS...");
  try {
    const response = await fetch(`${AI_ENGINE_URL}/streams/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" ,
        "ngrok-skip-browser-warning": "true"},
      body: JSON.stringify({ id: ref.id, sourceUrl, model }),
    });

    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Engine HTTP ${response.status}: ${errorText}`);
      throw new Error(`AI Engine error: HTTP ${response.status} - ${errorText.substring(0, 100)}`);
    }

    const engineRes = await response.json();
    console.log("Engine Resposne",engineRes);
  
    if (!engineRes.streamId) {
      throw new Error(`Invalid engine response: ${JSON.stringify(engineRes)}`);
    }

    await ref.update({
      status: "active",
      engineStreamId: engineRes.streamId,
      aiEngineUrl: engineRes.aiEngineUrl,
    });

    const doc = await ref.get();
    return { id: doc.id, ...doc.data() };

  } catch (err) {
    console.error("Engine start failed:", err.message);
    await ref.update({ 
      status: "ERROR", 
      error: err.message 
    });
    throw err;
  }
};

exports.list = async (user) => {
  const snap = await db
    .collection(COLLECTION)
    .where("status", "!=", "DELETED")
    .get();

  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(s =>
      user.role === "ADMIN" ||
      s.assignedRoles?.includes(user.role)
    );
};

exports.remove = async (id) => {
  const ref = db.collection(COLLECTION).doc(id);
  const doc = await ref.get();

  if (!doc.exists) throw new Error("Stream not found");

  const data = doc.data();

  
  if (data.engineStreamId) {
    await fetch(`${AI_ENGINE_URL}/streams/${data.engineStreamId}/stop`, {
      method: "POST",
    });
  }

  await ref.update({ status: "DELETED" });
};

exports.update = async (id, updates) => {
  const ref = db.collection(COLLECTION).doc(id);
  await ref.update(updates);
  const doc = await ref.get();
  return { id, ...doc.data() };
};

exports.listActive = async () => {
  const snap = await db
    .collection(COLLECTION)
    .where("status", "!=", "DELETED")
    .get();
  return snap.docs.map(d => ({ 
    id: d.id, 
    ...d.data() 
  }));
};