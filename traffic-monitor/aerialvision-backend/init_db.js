const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json"); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();


const benchmarkData = [
  {
    model: "Mark-1",
    modelId: "mark-1",
    view: "ground",
    frames: 469,
    total_detections: 74,
    emergency_detections: 28,
    classCounts: { car: 0, truck: 70, bus: 4 }
  },
  {
    model: "Mark-2",
    modelId: "mark-2",
    view: "aerial",
    frames: 447,
    total_detections: 15859,
    emergency_detections: 12746,
    classCounts: { car: 15674, bus: 184, truck: 1 }
  },
  {
    model: "Mark-2",
    modelId: "mark-2",
    view: "ground",
    frames: 469,
    total_detections: 1680,
    emergency_detections: 1453,
    classCounts: { car: 1430, truck: 223, bus: 27 }
  },
  {
    model: "Mark-2.5",
    modelId: "mark-2.5",
    view: "aerial",
    frames: 447,
    total_detections: 985,
    emergency_detections: 590,
    classCounts: { car: 704, truck: 281, bus: 0 }
  },
  {
    model: "Mark-2.5",
    modelId: "mark-2.5",
    view: "ground",
    frames: 469,
    total_detections: 4299,
    emergency_detections: 962,
    classCounts: { car: 3970, truck: 327, bus: 2 }
  },
  {
    model: "Mark-3",
    modelId: "mark-3",
    view: "aerial",
    frames: 447,
    total_detections: 8120,
    emergency_detections: 5340,
    classCounts: { car: 7600, truck: 420, bus: 100 }
  },
  {
    model: "Mark-3",
    modelId: "mark-3",
    view: "ground",
    frames: 469,
    total_detections: 6120,
    emergency_detections: 1800,
    classCounts: { car: 5400, truck: 600, bus: 120 }
  }
];

async function seed() {
  console.log("🚀 Initializing Global Governance Policy...");

  await db.collection("model_config").doc("global_policy").set({
    
    models: {
      "mark-3": { 
        label: "Mark-3 (Transformer-Enhanced)", 
        status: "production", 
        locked: true,
        version: "v3.0.1" 
      },
      "mark-2.5": { 
        label: "Mark-2.5 (Stable)", 
        status: "allowed", 
        locked: false,
        version: "v2.5.4"
      },
      "mark-2": { 
        label: "Mark-2 (Legacy)", 
        status: "allowed", 
        locked: false,
        warning: "High noise in aerial views" 
      },
      "mark-1": { 
        label: "Mark-1 (Deprecated)", 
        status: "disabled", 
        locked: false,
        warning: "Accuracy below acceptable threshold"
      }
    },

   
    perView: {
      "aerial": { 
        model: "mark-3", 
        locked: true, 
        reason: "Aerial views require high-precision object tracking." 
      },
      "ground": { 
        model: "mark-2.5", 
        locked: false,
        reason: "Standard traffic monitoring."
      }
    },

  
    benchmarks: benchmarkData,

    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log("✅ Database initialized! Benchmark data is now live in the backend.");
}

seed();