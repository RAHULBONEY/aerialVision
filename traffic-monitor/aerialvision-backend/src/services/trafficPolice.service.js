const { db } = require("../config/firebase");

const USERS_COLLECTION = "users";


exports.list = async (excludeUid = null) => {
  let query = db
    .collection(USERS_COLLECTION)
    .where("role", "==", "TRAFFIC_POLICE")
    .where("status", "==", "ACTIVE");

  const snapshot = await query.get();

  const officers = snapshot.docs
    .map((doc) => ({
      uid: doc.id,
      name: doc.data().name,
      email: doc.data().email,
      badge: doc.data().badge || null,
      department: doc.data().department || null,
      accessLevel: doc.data().accessLevel || 1,
      lastLoginAt: doc.data().lastLoginAt || null,
    }))
    .filter((officer) => officer.uid !== excludeUid);

  return officers;
};
