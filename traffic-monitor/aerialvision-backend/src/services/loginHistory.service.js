const admin = require("firebase-admin");
const db = admin.firestore();

const LOGIN_HISTORY_COLLECTION = "loginHistory";

/**
 * Records a login event asynchronously
 * @param {Object} data
 * @param {string} data.uid - User UID
 * @param {string} data.name - User Name
 * @param {string} data.email - User Email
 * @param {string} data.role - User Role
 * @param {string} data.ip - Original IP Address
 * @param {string} data.userAgent - Browser/Device User Agent string
 * @param {string} data.status - "SUCCESS" | "FAILED"
 */
exports.recordLogin = async (data) => {
  try {
    const logDoc = {
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    // Fire and forget, don't await so we don't block the profile fetch auth flow
    db.collection(LOGIN_HISTORY_COLLECTION).add(logDoc).catch(err => {
      console.error("Failed to write login history async:", err);
    });
    
    return true;
  } catch (error) {
    console.error("Error creating login history record:", error);
    return false;
  }
};

/**
 * Lists login history with pagination and filtering
 */
exports.list = async (params = {}) => {
  const pageSize = Number(params.limit) || 30;
  let query = db.collection(LOGIN_HISTORY_COLLECTION).orderBy("createdAt", "desc");

  if (params.role && params.role !== "ALL") {
    query = query.where("role", "==", params.role);
  }
  
  if (params.status && params.status !== "ALL") {
    query = query.where("status", "==", params.status);
  }
  
  if (params.uid) {
    query = query.where("uid", "==", params.uid);
  }

  // Handle cursor pagination
  if (params.cursor) {
    try {
      const cursorDoc = await db.collection(LOGIN_HISTORY_COLLECTION).doc(params.cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    } catch (err) {
      console.warn("Invalid cursor provided to login history list", params.cursor);
    }
  }

  // Fetch one extra to determine if there's a next page
  const snap = await query.limit(pageSize + 1).get();
  
  const docs = snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
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
