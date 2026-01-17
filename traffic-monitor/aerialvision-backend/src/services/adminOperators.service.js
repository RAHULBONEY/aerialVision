const admin = require("firebase-admin");
const db = admin.firestore();

const USERS_COLLECTION = "users";
const ROLE_PERMISSIONS = {
  TRAFFIC_POLICE: [
    "incidents:read",
    "incidents:write",
    "traffic:control",
    "streams:view",
    "streams:assign",
  ],
  EMERGENCY: [
    "incidents:read",
    "incidents:write",
    "streams:view",
  ],
  ADMIN: [
    "users:read",
    "users:write",
    "streams:view",
    "streams:assign",
    "model:configure",
  ],
};

exports.list = async ({ role, status }) => {
  let query = db.collection(USERS_COLLECTION);

  if (role) query = query.where("role", "==", role);
  if (status) query = query.where("status", "==", status);

  const snap = await query.orderBy("createdAt", "desc").get();

  return snap.docs.map((doc) => ({
    uid: doc.id,
    ...doc.data(),
  }));
};

exports.create = async (data, createdBy) => {
   const { email, password, name, role, accessLevel, badge, department } = data;

  if (!email || !password || !name || !role) {
    throw new Error("Missing required fields");
  }
    const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) {
    throw new Error("Invalid role");
  }

  const userRecord = await admin.auth().createUser({
    email,
    password,
    displayName: name,
  });

  const userDoc = {
    uid: userRecord.uid,
    email,
    name,
    role,
    accessLevel: accessLevel ?? 1,
    permissions,                 
    status: "ACTIVE",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy,
    lastLoginAt: null,
  };

  await db.collection("users").doc(userRecord.uid).set(userDoc);

  return userDoc;
};


exports.update = async (uid, updates) => {
  const allowed = ["name", "role", "accessLevel", "status"];
  const payload = {};

  allowed.forEach((key) => {
    if (updates[key] !== undefined) payload[key] = updates[key];
  });

  if (!Object.keys(payload).length) {
    throw new Error("No valid fields to update");
  }

  await db.collection(USERS_COLLECTION).doc(uid).update(payload);

  const doc = await db.collection(USERS_COLLECTION).doc(uid).get();
  return { uid, ...doc.data() };
};

exports.updateStatus = async (uid, status) => {
  if (!["ACTIVE", "SUSPENDED"].includes(status)) {
    throw new Error("Invalid status");
  }

  await db.collection(USERS_COLLECTION).doc(uid).update({ status });

  if (status === "SUSPENDED") {
    await admin.auth().updateUser(uid, { disabled: true });
  } else {
    await admin.auth().updateUser(uid, { disabled: false });
  }
};

exports.softDelete = async (uid) => {
  await db.collection(USERS_COLLECTION).doc(uid).update({
    status: "DELETED",
  });

  await admin.auth().updateUser(uid, { disabled: true });
};
