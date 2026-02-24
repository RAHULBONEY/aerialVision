const admin = require("firebase-admin");
const db = admin.firestore();

const AUDIT_LOGS_COLLECTION = "auditLogs";

/**
 * Logs an action to the audit logs collection
 * @param {Object} data - Audit log data
 * @param {string} data.action - Action performed (e.g., "CREATE_ROLE", "DISPATCH_UNIT")
 * @param {string} data.category - Category of action (e.g., "ROLES", "EMERGENCY", "TRAFFIC")
 * @param {Object} data.performedBy - User who performed the action {uid, name, role}
 * @param {string} data.targetId - ID of the affected document/entity
 * @param {string} data.targetName - Human-readable name of the affected entity
 * @param {Object} [data.details] - Additional contextual details
 */
exports.logAction = async (data) => {
  try {
    const logDoc = {
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    // Fire and forget
    db.collection(AUDIT_LOGS_COLLECTION).add(logDoc).catch(err => {
      console.error("Failed to write audit log asynchronously:", err);
    });
    
    return true;
  } catch (error) {
    console.error("Error creating audit log:", error);
    // Don't throw so it doesn't break the main operation
    return false;
  }
};

/**
 * Lists audit logs with pagination and filtering
 * @param {Object} params - Query parameters
 * @param {number} [params.limit=25] - Max number of results 
 * @param {string} [params.cursor] - Firestore document ID to start after
 * @param {string} [params.category] - Filter by category
 * @param {string} [params.action] - Filter by exact action
 * @param {string} [params.performedByUid] - Filter by user UID
 */
exports.list = async (params = {}) => {
  const pageSize = Number(params.limit) || 25;
  let query = db.collection(AUDIT_LOGS_COLLECTION).orderBy("createdAt", "desc");

  if (params.category && params.category !== "ALL") {
    query = query.where("category", "==", params.category);
  }
  
  if (params.action) {
    query = query.where("action", "==", params.action);
  }
  
  if (params.performedByUid) {
    query = query.where("performedBy.uid", "==", params.performedByUid);
  }

  // Handle cursor pagination
  if (params.cursor) {
    try {
      const cursorDoc = await db.collection(AUDIT_LOGS_COLLECTION).doc(params.cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    } catch (err) {
      console.warn("Invalid cursor provided to audit logs list", params.cursor);
    }
  }

  // Fetch one extra to determine if there's a next page
  const snap = await query.limit(pageSize + 1).get();
  
  const docs = snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    // Convert serverTimestamp to ISO string or null if pending
    createdAt: doc.data().createdAt ? doc.data().createdAt.toDate().toISOString() : new Date().toISOString()
  }));

  const hasMore = docs.length > pageSize;
  const data = hasMore ? docs.slice(0, pageSize) : docs;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return {
    data,
    nextCursor,
    hasMore
  };
};
