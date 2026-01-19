const { db } = require('../config/firebase');
const admin = require('firebase-admin');

exports.acknowledgeIncident = async (req, res) => {
  const { id } = req.params;
  const { note } = req.body; 
  const userId = req.user.uid; 

  try {
    const incidentRef = db.collection('incidents').doc(id);
    const doc = await incidentRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: "Incident not found" });
    }

    if (doc.data().status !== 'NEW') {
      return res.status(400).json({ success: false, message: "Incident already acknowledged" });
    }

    
    await incidentRef.update({
      status: 'ACKNOWLEDGED',
      operatorAction: {
        ackedBy: userId, 
        ackedAt: admin.firestore.Timestamp.now(),
        note: note || "Acknowledged via Dashboard"
      }
    });

    res.json({ success: true, message: "Incident acknowledged" });
  } catch (error) {
    console.error("Ack Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};