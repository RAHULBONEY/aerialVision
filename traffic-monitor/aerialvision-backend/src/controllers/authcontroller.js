const { db } = require('../config/firebase');
const loginHistoryService = require('../services/loginHistory.service');

const getProfile = async (req, res) => {

  const snap = await db
  .collection('users')
  .where('uid', '==', req.user.uid)
  .limit(1)
  .get();

if (snap.empty) {
  return res.status(404).json({ success: false });
}

const user = snap.docs[0].data();

  // Record login event if requested
  if (req.headers['x-login-event'] === 'true') {
    loginHistoryService.recordLogin({
      uid: req.user.uid,
      name: user.name || "Unknown",
      email: user.email || "Unknown",
      role: user.role || "UNKNOWN",
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || "Unknown",
      userAgent: req.headers['user-agent'] || "Unknown",
      status: "SUCCESS"
    });
  }

  res.json({
    success: true,
    data: {
      uid: req.user.uid,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    }
  });
};

const logout = async (req, res) => {
  res.json({ success: true });
};

module.exports = { getProfile, logout };
