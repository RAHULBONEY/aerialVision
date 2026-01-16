const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole, ROLES } = require('../middleware/rbac');
const authController = require('../controllers/authcontroller');
const rateLimit = require('../middleware/rateLimit');

// Public routes
router.post('/login', rateLimit.loginLimiter, authController.login);

// Protected routes
router.use(authenticateToken); 

router.post('/logout', authController.logout);
router.get('/profile', authController.getProfile);

// Admin only routes
router.post('/users', requireRole(ROLES.ADMIN_ONLY, 5), authController.createUser);

module.exports = router;
