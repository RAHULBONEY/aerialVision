

const { admin, db } = require("../config/firebase");

const authenticateToken = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ success: false, message: "No token" });
  }

  const token = header.split(" ")[1];

  try {
   
    const decoded = await admin.auth().verifyIdToken(token);

   
    const snap = await db
      .collection("users")
      .where("uid", "==", decoded.uid)
      .limit(1)
      .get();

    if (snap.empty) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    const userData = snap.docs[0].data();

    
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      role: userData.role,
      accessLevel:
        typeof userData.accessLevel === "number"
          ? userData.accessLevel
          : 1,
      status: userData.status,
      name: userData.name,
    };

    next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

module.exports = { authenticateToken };

