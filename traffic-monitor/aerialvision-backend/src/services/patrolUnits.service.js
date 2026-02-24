const { db } = require("../config/firebase");
const admin = require("firebase-admin");

const COLLECTION = "patrol_units";

/**
 * Create a new patrol unit
 */
exports.create = async (payload, createdByUid) => {
  const { unitCode, officerName, location, address, status = "AVAILABLE" } = payload;

  if (!unitCode || !officerName || !location?.lat || !location?.lng) {
    throw new Error("Missing required fields: unitCode, officerName, location");
  }

  const docRef = db.collection(COLLECTION).doc();
  const now = admin.firestore.FieldValue.serverTimestamp();

  const patrolUnit = {
    id: docRef.id,
    unitCode: unitCode.toUpperCase(),
    officerName,
    status,
    address: address || null,
    location: {
      lat: parseFloat(location.lat),
      lng: parseFloat(location.lng),
    },
    lastUpdated: now,
    createdAt: now,
    createdBy: createdByUid,
    assignedIncidentId: null,
  };

  await docRef.set(patrolUnit);

  return {
    ...patrolUnit,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
};

/**
 * Get all patrol units
 */
exports.getAll = async () => {
  const snapshot = await db
    .collection(COLLECTION)
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      lastUpdated: data.lastUpdated?.toDate?.()?.toISOString() || null,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
    };
  });
};

/**
 * Get a single patrol unit by ID
 */
exports.getById = async (unitId) => {
  const doc = await db.collection(COLLECTION).doc(unitId).get();

  if (!doc.exists) {
    throw new Error("Patrol unit not found");
  }

  const data = doc.data();
  return {
    ...data,
    id: doc.id,
    lastUpdated: data.lastUpdated?.toDate?.()?.toISOString() || null,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
  };
};

/**
 * Update patrol unit location
 */
exports.updateLocation = async (unitId, location) => {
  if (!location?.lat || !location?.lng) {
    throw new Error("Invalid location data");
  }

  const docRef = db.collection(COLLECTION).doc(unitId);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new Error("Patrol unit not found");
  }

  await docRef.update({
    location: {
      lat: parseFloat(location.lat),
      lng: parseFloat(location.lng),
    },
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
  });

  return exports.getById(unitId);
};

/**
 * Update patrol unit status
 */
exports.updateStatus = async (unitId, status) => {
  const validStatuses = ["AVAILABLE", "ON_PATROL", "BUSY"];

  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
  }

  const docRef = db.collection(COLLECTION).doc(unitId);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new Error("Patrol unit not found");
  }

  await docRef.update({
    status,
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
  });

  return exports.getById(unitId);
};

/**
 * Dispatch patrol unit to an incident
 */
exports.dispatchToIncident = async (unitId, incidentId, userId, userName) => {
  const unitRef = db.collection(COLLECTION).doc(unitId);
  const incidentRef = incidentId ? db.collection("incidents").doc(incidentId) : null;

  await db.runTransaction(async (transaction) => {
    // 1. Read operations
    const unitDoc = await transaction.get(unitRef);
    if (!unitDoc.exists) {
      throw new Error("Patrol unit not found");
    }

    if (incidentRef) {
      const incidentDoc = await transaction.get(incidentRef);
      if (!incidentDoc.exists) {
        throw new Error("Incident not found");
      }
      if (incidentDoc.data().status !== "NEW") {
        throw new Error("Incident is no longer new and cannot be assigned");
      }
    }

    // 2. Write operations
    const unitData = unitDoc.data();
    const officerName = unitData.officerName || "Unknown Officer";

    // Update Unit
    transaction.update(unitRef, {
      assignedIncidentId: incidentId || null,
      status: incidentId ? "BUSY" : "AVAILABLE",
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update Incident
    if (incidentRef) {
      const timestamp = new Date().toISOString();
      const actionNote = `Assigned to unit ${unitData.unitCode} (${officerName}) by ${userName || userId}`;

      transaction.update(incidentRef, {
        status: "ACKNOWLEDGED",
        ackedBy: officerName,
        ackedAt: admin.firestore.FieldValue.serverTimestamp(),
        note: actionNote,
        operatorAction: {
          action: "ASSIGN_UNIT",
          ackedBy: officerName,
          assignedBy: userName || userId,
          assignedAt: timestamp,
          note: actionNote
        }
      });
    }
  });

  return exports.getById(unitId);
};

/**
 * Delete a patrol unit
 */
exports.remove = async (unitId) => {
  const docRef = db.collection(COLLECTION).doc(unitId);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new Error("Patrol unit not found");
  }

  await docRef.delete();
  return { success: true, id: unitId };
};
