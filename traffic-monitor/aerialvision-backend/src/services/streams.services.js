const admin = require("firebase-admin");
const db = admin.firestore();

const COLLECTION = "streams";

exports.create = async (data, createdBy) => {
  const required = ["name", "type", "sourceUrl", "aiEngineUrl"];
  required.forEach(f => {
    if (!data[f]) throw new Error(`${f} is required`);
  });

  const doc = {
    ...data,
    status: "ACTIVE",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy
  };

  const ref = await db.collection(COLLECTION).add(doc);
  return { id: ref.id, ...doc };
};

exports.list = async (user) => {
  let query = db.collection(COLLECTION).where("status", "!=", "DELETED");

  const snap = await query.get();

  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(s =>
      s.assignedRoles?.includes(user.role) || user.role === "ADMIN"
    );
};

exports.update = async (id, updates) => {
  await db.collection(COLLECTION).doc(id).update(updates);
  const doc = await db.collection(COLLECTION).doc(id).get();
  return { id, ...doc.data() };
};

exports.remove = async (id) => {
  await db.collection(COLLECTION).doc(id).update({
    status: "DELETED"
  });
};
