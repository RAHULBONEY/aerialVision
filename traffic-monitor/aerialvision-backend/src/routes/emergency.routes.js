const express = require('express');
const router = express.Router();
const emergencyController = require('../controllers/emergency.controller');
// const { authenticateOperator } = require('../middleware/auth.middleware');


router.post('/routes', emergencyController.computeRoutes);
router.get('/routes/history', emergencyController.getRouteHistory);
router.get('/routes/:sessionId/tiles', emergencyController.pollTiles);
router.get('/tiles/:tileId', emergencyController.serveTile);
router.delete('/routes/:sessionId', emergencyController.deleteSession);
router.post('/routes/:sessionId/analyze', emergencyController.analyzeRoute);

module.exports = router;
