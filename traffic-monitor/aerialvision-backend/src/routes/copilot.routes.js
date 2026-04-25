const router = require('express').Router();
const copilotController = require('../controllers/copilot.controller');
const { authenticateToken } = require('../middleware/auth');

router.post('/chat', authenticateToken, copilotController.chat);

module.exports = router;