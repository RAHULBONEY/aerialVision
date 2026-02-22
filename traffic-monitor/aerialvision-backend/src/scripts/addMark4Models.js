
require("dotenv").config();
const admin = require("firebase-admin");
const { FieldPath, FieldValue } = admin.firestore;

admin.initializeApp({
  credential: admin.credential.cert({
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
  }),
});

const db = admin.firestore();

async function seedMark4And5() {
  const ref = db.collection("model_config").doc("global_policy");

  console.log("Seeding Mark-4 and Mark-5");

  // ---- MODELS ----
  await ref.update({
    [new FieldPath("models", "mark-4")]: {
      label: "Mark-4 (Research)",
      status: "experimental",
      locked: false,
      warning: "Experimental - Higher compute cost",
      version: "v4.0.0-beta",
    },

    [new FieldPath("models", "mark-5")]: {
      label: "Mark-5 (Advanced)",
      status: "experimental",
      locked: false,
      warning: "Recommended for aerial views - Best precision",
      version: "v5.0.0-beta",
    },

    lastUpdated: FieldValue.serverTimestamp(),
  });

  // ---- BENCHMARKS ----
  const snap = await ref.get();
  const benchmarks = snap.data().benchmarks || [];

  const hasMark5 = benchmarks.some(b => b.modelId === "mark-5");

  if (!hasMark5) {
    await ref.update({
      benchmarks: FieldValue.arrayUnion(
        {
          model: "Mark-4",
          modelId: "mark-4",
          view: "aerial",
          frames: 447,
          total_detections: 9500,
          emergency_detections: 6200,
          classCounts: { car: 8500, bus: 150, truck: 550, ambulance: 300 },
        },
        {
          model: "Mark-4",
          modelId: "mark-4",
          view: "ground",
          frames: 469,
          total_detections: 7200,
          emergency_detections: 2100,
          classCounts: { car: 6200, bus: 180, truck: 720, ambulance: 100 },
        },
        {
          model: "Mark-5",
          modelId: "mark-5",
          view: "aerial",
          frames: 447,
          total_detections: 11500,
          emergency_detections: 7800,
          classCounts: { car: 10200, bus: 200, truck: 700, ambulance: 400 },
        },
        {
          model: "Mark-5",
          modelId: "mark-5",
          view: "ground",
          frames: 469,
          total_detections: 8800,
          emergency_detections: 2600,
          classCounts: { car: 7600, bus: 220, truck: 880, ambulance: 100 },
        }
      ),
    });
  }

  console.log("Mark-4 and Mark-5 seeded cleanly");
  process.exit(0);
}

seedMark4And5();
