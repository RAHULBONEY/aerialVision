const admin = require("firebase-admin");
const db = admin.firestore();


const CONFIG_DOC = "global_policy";
const CONFIG_COLLECTION = "model_config";

exports.getGovernancePolicy = async () => {
  const doc = await db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC).get();
  if (!doc.exists) throw new Error("Governance policy not found");
  return doc.data();
};

exports.getEnforcedModel = async (requestedModel, viewType) => {
  const policy = await exports.getGovernancePolicy();
  

  const safeView = viewType ? viewType.toLowerCase() : "ground";
  const viewRules = policy.perView[safeView] || policy.perView["ground"];

  
  if (viewRules.locked) {
    return { 
      model: viewRules.model, 
      isLocked: true, 
      reason: viewRules.reason 
    };
  }

  
  const modelInfo = policy.models[requestedModel];
  if (requestedModel && modelInfo && modelInfo.status !== "disabled") {
    return { 
      model: requestedModel, 
      isLocked: false, 
      reason: "User selection allowed" 
    };
  }

  
  return { 
    model: viewRules.model, 
    isLocked: false, 
    reason: "Requested model invalid or missing, using view default" 
  };
};

exports.detectViewType = async (url) => {
  try {
    
    const BASE_URI = process.env.PROBE_URI || "http://127.0.0.1:8001";
    const PROBE_URL = `${BASE_URI}/probe`;

    // console.log(`📡 Contacting Local AI Probe: ${PROBE_URL}`);

    
    const response = await fetch(PROBE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceUrl: url }),
      
    });

    if (!response.ok) {
        throw new Error(`Probe returned status ${response.status}`);
    }

    const data = await response.json();
    // console.log(`✅ AI Verdict: ${data.viewType} (${data.reason})`);
    
    return data.viewType; 

  } catch (error) {
    console.warn("⚠️ AI Probe Failed (Falling back to keywords):", error.message);
    return fallbackDetection(url);
  }
};


function fallbackDetection(url) {
  if (!url) return "GROUND";
  const lower = url.toLowerCase();
  if (lower.includes("drone") || lower.includes("aerial") || lower.includes("fly")) return "AERIAL";
  return "GROUND";
}

exports.updatePolicy = async (section, key, updates) => {
const updatePath = `${section}.${key}`;
  await db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC).update({
    [updatePath]: updates
  });
};

exports.updateGovernancePolicy = async (newPolicy) => {
//   console.log("🧠 updateGovernancePolicy input:", JSON.stringify(newPolicy, null, 2));

  if (!newPolicy.models || !newPolicy.perView) {
    throw new Error("Invalid policy structure");
  }

//   for (const [id, model] of Object.entries(newPolicy.models)) {
//     console.log(`🔍 Model ${id}:`, model);
//   }

  const policyToSave = {
    ...newPolicy,
    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
  };

//   console.log("💾 Writing to Firestore:", Object.keys(policyToSave));

  await db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC).set(policyToSave, { merge: true });

//   console.log("✅ Firestore update complete");
  return policyToSave;
};
