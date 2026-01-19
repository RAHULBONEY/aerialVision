const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

const seedIncidents = async () => {
  const incidents = [
    {
      streamId: "cam-002-junction", 
      streamName: "Palm Beach Rd Junction",
      type: "CONGESTION",
      severity: "HIGH",
      status: "NEW", 
      description: "Traffic density > 95% with 0 velocity detected.",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      snapshot: { density: 0.95, speed: 5, vehicleCount: 64 }
    },
    {
      streamId: "cam-003-toll", 
      streamName: "Mumbai Entry Toll",
      type: "OBSTRUCTION",
      severity: "MEDIUM",
      status: "ACKNOWLEDGED", 
      description: "Stationary truck detected in Lane 2.",
      timestamp: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3600000)), 
      snapshot: { density: 0.4, speed: 0, vehicleCount: 12 },
      operatorAction: {
        ackedBy: "Ayush Jadhav",
        ackedAt: new Date().toISOString(),
        note: "Unit 4 dispatched for towing."
      }
    }
  ];

  const batch = db.batch();
  incidents.forEach(inc => {
    const ref = db.collection('incidents').doc();
    batch.set(ref, inc);
  });

  await batch.commit();
  console.log("✅ Incidents Seeded.");
};

seedIncidents();