const { db } = require('../config/firebase');

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
