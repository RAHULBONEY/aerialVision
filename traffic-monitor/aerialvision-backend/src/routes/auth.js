const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {getProfile,logout}=require("../controllers/authcontroller.js")

router.use(authenticateToken);

router.get('/profile', (req, res, next) => {
  console.log('HIT /api/auth/profile');
  next();
}, getProfile);
router.post('/logout', logout);

module.exports = router;
