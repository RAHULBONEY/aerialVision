const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { acknowledgeIncident } = require('../controllers/incident.controller');

router.use(authenticateToken);


router.patch('/:id/acknowledge', acknowledgeIncident);

module.exports = router;