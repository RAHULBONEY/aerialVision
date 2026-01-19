const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); 


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();


const dummyStreams = [
  {
    id: "cam-001-drone",
    name: "Vashi Bridge Patrol",
    type: "DRONE",
    viewType: "aerial", 
   
    url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", 
    sourceUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", 
    location: { lat: 19.033, lng: 73.029 },
    currentStatus: "NORMAL",
    activeModel: "mark-2",
    metrics: {
      speed: 45,
      density: 0.12,
      vehicleCount: 8
    },
    lastHeartbeat: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    id: "cam-002-junction",
    name: "Palm Beach Rd Junction",
    type: "CCTV",
    viewType: "ground", 
    
    url: "http://qthttp.apple.com.edgesuite.net/1010qwoeiuryfg/sl.m3u8",
    sourceUrl: "http://qthttp.apple.com.edgesuite.net/1010qwoeiuryfg/sl.m3u8",
    location: { lat: 19.035, lng: 73.020 },
    currentStatus: "CRITICAL",
    activeModel: "mark-2.5",
    metrics: {
      speed: 5,
      density: 0.95,
      vehicleCount: 64
    },
    lastHeartbeat: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    id: "cam-003-toll",
    name: "Mumbai Entry Toll",
    type: "CCTV",
    viewType: "ground",
    url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    sourceUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    location: { lat: 19.040, lng: 73.015 },
    currentStatus: "WARNING",
    activeModel: "mark-2.5",
    metrics: {
      speed: 0,
      density: 0.4,
      vehicleCount: 12
    },
    lastHeartbeat: admin.firestore.FieldValue.serverTimestamp()
  }
];


const seedDatabase = async () => {
  console.log(`🚀 Starting Seed Process for ${dummyStreams.length} streams...`);
  
  const batch = db.batch();

  dummyStreams.forEach((stream) => {
    const docRef = db.collection('streams').doc(stream.id);
    batch.set(docRef, stream);
    console.log(`   - Prepared: ${stream.name} [${stream.viewType}]`);
  });

  try {
    await batch.commit();
    console.log(`✅ Success! Streams collection populated.`);
    console.log(`   Go to your dashboard to see the results.`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding Failed:", error);
    process.exit(1);
  }
};

seedDatabase();