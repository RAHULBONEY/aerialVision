const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const { requireRole, ROLES } = require('../middleware/rbac');
const incidentController = require('../controllers/incident.controller');

// Configure multer for video uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  }
});

// All routes require authentication
router.use(authenticateToken);

// ==================== READ OPERATIONS ====================

// GET /api/incidents - List all incidents
router.get('/', incidentController.listIncidents);

// GET /api/incidents/stats - Get incident statistics
router.get('/stats', incidentController.getIncidentStats);

// GET /api/incidents/simulations - Get available simulation scenarios
router.get('/simulations', incidentController.getSimulations);

// GET /api/incidents/:id - Get single incident
router.get('/:id', incidentController.getIncident);

// ==================== WRITE OPERATIONS ====================

// PATCH /api/incidents/:id/acknowledge - Acknowledge an incident
router.patch('/:id/acknowledge', incidentController.acknowledgeIncident);

// PATCH /api/incidents/:id/resolve - Resolve an incident
router.patch('/:id/resolve', incidentController.resolveIncident);

// ==================== ANALYSIS OPERATIONS (Admin only) ====================

// POST /api/incidents/analyze/simulation - Start simulation analysis
router.post(
  '/analyze/simulation',
  requireRole(ROLES.ADMIN_ONLY),
  incidentController.startSimulation
);

// POST /api/incidents/analyze/upload - Analyze uploaded video
router.post(
  '/analyze/upload',
  requireRole(ROLES.ADMIN_ONLY),
  upload.single('video'),
  incidentController.analyzeUpload
);

module.exports = router;