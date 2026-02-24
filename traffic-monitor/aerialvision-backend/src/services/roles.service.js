const admin = require("firebase-admin");
const db = admin.firestore();

const ROLES_COLLECTION = "roles";

// Seed data or initial fetch logic could be here if needed, but we'll stick to CRUD.
exports.list = async () => {
  const snap = await db.collection(ROLES_COLLECTION).orderBy("createdAt", "desc").get();
  return snap.docs.map((doc) => ({
    uid: doc.id,
    ...doc.data(),
  }));
};

exports.create = async (data, createdBy) => {
  const { name, description, permissions, accessLevel } = data;

  if (!name || !description || !Array.isArray(permissions)) {
    throw new Error("Missing required fields: name, description, or permissions");
  }

  // Prevent duplicate names
  const existing = await db.collection(ROLES_COLLECTION).where("name", "==", name).get();
  if (!existing.empty) {
    throw new Error(`Role with name ${name} already exists`);
  }

  const roleDoc = {
    name,
    description,
    permissions,
    accessLevel: accessLevel ?? 1,
    isSystem: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const ref = await db.collection(ROLES_COLLECTION).add(roleDoc);
  return { uid: ref.id, ...roleDoc };
};

exports.update = async (uid, updates) => {
  const allowed = ["name", "description", "permissions", "accessLevel"];
  const payload = {};

  allowed.forEach((key) => {
    if (updates[key] !== undefined) payload[key] = updates[key];
  });

  if (!Object.keys(payload).length) {
    throw new Error("No valid fields to update");
  }

  payload.updatedAt = admin.firestore.FieldValue.serverTimestamp();

  await db.collection(ROLES_COLLECTION).doc(uid).update(payload);

  const doc = await db.collection(ROLES_COLLECTION).doc(uid).get();
  return { uid, ...doc.data() };
};

exports.delete = async (uid) => {
  const docRef = db.collection(ROLES_COLLECTION).doc(uid);
  const doc = await docRef.get();
  
  if (!doc.exists) {
    throw new Error("Role not found");
  }

  if (doc.data().isSystem) {
    throw new Error("Cannot delete a system role");
  }

  await docRef.delete();
};
